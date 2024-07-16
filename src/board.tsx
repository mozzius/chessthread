import React from "react";
import { ChessBoard, Piece, Side } from "chess";
import satori from "satori";
import fs from "node:fs/promises";

const pieces = new Map<`${Piece["type"]}-${Side["name"]}`, Buffer>();

for (const color of ["white", "black"] as const) {
  for (const piece of [
    "pawn",
    "rook",
    "knight",
    "bishop",
    "queen",
    "king",
  ] as const) {
    const pieceName = `${piece}-${color}`;
    const pieceImage = await fs.readFile(`./pieces/${pieceName}.svg`);
    pieces.set(`${piece}-${color}`, pieceImage);
  }
}

function getPieceImage(piece?: Piece) {
  if (!piece) return;
  return pieces.get(`${piece.type}-${piece.side.name}`);
}

export async function getImageForBoard(board: ChessBoard) {
  return await satori(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexWrap: "wrap",
      }}
    >
      {Array.from({ length: 64 }, (_, i) => {
        const rank = 8 - Math.floor(i / 8);
        const col = String.fromCharCode(97 + (i % 8));

        const square = board.squares.find(
          (p) => p.file === col && p.rank === rank
        );

        const image = getPieceImage(square?.piece);

        return (
          <div
            key={i}
            style={{
              display: "flex",
              width: 128,
              height: 128,
              background:
                (i % 2 === 0) === (rank % 2 === 0) ? "#F1F1DA" : "#88A569",
            }}
          >
            {image && (
              <img
                src={`data:image/svg+xml;base64,${image.toString("base64")}`}
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </div>
        );
      })}
    </div>,
    {
      height: 1024,
      width: 1024,
      fonts: [],
    }
  );
}
