import { AppBskyEmbedImages, AppBskyFeedPost } from "@atproto/api";
import {
  ComAtprotoSyncSubscribeRepos,
  SubscribeReposMessage,
  subscribeRepos,
} from "atproto-firehose";
import { getAgent } from "./agent.js";
import { create } from "chess";
import { getImageForBoard } from "./board.js";
import { Transformer } from "@napi-rs/image";

const DID = "did:plc:xxlgzpjfmxcmn3ekkn32vebd";
const THREAD =
  "at://did:plc:xxlgzpjfmxcmn3ekkn32vebd/app.bsky.feed.post/3kxf2st53h22c";

async function play(
  text: string,
  reply: AppBskyFeedPost.ReplyRef,
  parent: string
) {
  try {
    const move = text.split(" ").at(0);
    if (!move) return;
    console.log("Playing move", move);
    const agent = await getAgent();
    let previousMoves: string[] = [];
    if (parent !== THREAD) {
      const { data } = await agent.getPosts({ uris: [parent] });
      const post = data.posts[0];
      if (post) {
        if (AppBskyEmbedImages.isView(post.embed)) {
          const image = post.embed.images.at(0)!;
          previousMoves = image.alt.split("\n");
        } else {
          throw new Error("Missing image");
        }
      } else {
        throw new Error("Cannot find previous post");
      }
    }
    const game = create({ PGN: true });

    for (const move of previousMoves) {
      game.move(move);
    }

    game.move(move);

    const image = await getImageForBoard(game.getStatus().board);

    const blob = await agent.uploadBlob(
      await Transformer.fromSvg(image).png(),
      {
        encoding: "type:image/png",
      }
    );

    await agent.post({
      text: "",
      reply,
      embed: {
        $type: "app.bsky.embed.images",
        images: [
          {
            image: blob.data.blob,
            alt:
              previousMoves.length === 0
                ? move
                : previousMoves.join("\n") + "\n" + move,
            aspectRatio: {
              height: 1024,
              width: 1024,
            },
          },
        ],
      },
    });
  } catch (e) {
    console.error(e);
  }
}

const subscribe = async () => {
  const client = subscribeRepos(`wss://bsky.network`, { decodeRepoOps: true });
  client.on("message", (m: SubscribeReposMessage) => {
    if (ComAtprotoSyncSubscribeRepos.isCommit(m)) {
      if (m.repo === DID) return;
      m.ops.forEach((op) => {
        if (AppBskyFeedPost.isRecord(op.payload)) {
          if (
            op.payload.reply?.root.uri === THREAD &&
            op.payload.reply.parent.uri.includes(DID)
          ) {
            const uri = `at://${m.repo}/${op.path}`;
            play(
              op.payload.text,
              {
                root: op.payload.reply.root,
                parent: {
                  uri,
                  cid: String(op.cid),
                },
              },
              op.payload.reply.parent.uri
            );
          }
        }
      });
    }
  });
  client.on("error", (e) => {
    console.error(e);
  });
  client.on("close", () => {
    setTimeout(subscribe, 1000);
  });
};

subscribe();
