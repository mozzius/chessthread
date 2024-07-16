import { input } from "@inquirer/prompts";
import { create } from "chess";
import fs from "node:fs/promises";
import { getImageForBoard } from "src/board.js";

const state = await input({
  message: "Board state (comma-separated)",
});

const game = create();

if (state) {
  for (const move of state.split(",")) {
    game.move(move);
  }
}

console.log(
  game
    .getStatus()
    .board.squares.map(
      (square, i) =>
        (i % 8 === 0 && i !== 0 ? "\n" : "") +
        (square.piece?.type?.at(0) ?? ".")
    )
    .join("")
);

const board = await getImageForBoard(game.getStatus().board);

await fs.writeFile("board.svg", board);
