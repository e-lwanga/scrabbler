import { useEffect, useRef, useState } from "react";
import { ValueNotifier, ValueNotifiersListener } from "./lib/values";
import PromiseBuilder from "./lib/promise_builder";
import findHighestScorePlayables from "./core/findHighestScorePlayables";

// Dictionary: https://github.com/redbo/scrabble/blob/master/dictionary.txt

function BoardState([width, height]) {
  const buildLength = width * height;

  const build = [];

  for (let i = 0; i < buildLength; i++) {
    build.push(new BoardStateCell());
  }

  this.getSize = () => [width, height];

  this.getCell = ([x, y]) => {
    if (x < width && y < height) {
      return build[y * width + x];
    }
    return undefined;
  };

  this.toTransferrable = () => {
    const transferrableObj = [];
    for (let i = 0; i < width; i++) {
      const column = [];
      for (let j = 0; j < height; j++) {
        const item = this.getCell([i, j]);
        column.push({
          dl: item.getDl(),
          dw: item.getDw(),
          tl: item.getTl(),
          tw: item.getTw(),
          occupant: item.getOccupant(),
        });
      }
      transferrableObj.push(column);
    }

    return JSON.stringify(transferrableObj);
  };
}

BoardState.fromTransferrable = (transferrable) => {
  const transferrableObj = JSON.parse(transferrable);
  const boardState = new BoardState([
    transferrableObj.length,
    transferrableObj[0]?.length || 0,
  ]);
  for (let i = 0; i < transferrableObj.length; i++) {
    const column = transferrableObj[i];
    for (let j = 0; j < column.length; j++) {
      const item = column[j];
      const cell = boardState.getCell([i, j]);
      cell.setDl(item.dl);
      cell.setDw(item.dw);
      cell.setTl(item.tl);
      cell.setTw(item.tw);
      cell.setOccupant(item.occupant);
    }
  }

  return boardState;
};

function BoardStateCell({ dl, dw, tl, tw, occupant } = {}) {
  let _dl = false;
  let _dw = false;
  let _tl = false;
  let _tw = false;
  let _occupant = null;

  if (dl !== undefined) {
    _dl = dl;
  }
  if (dw !== undefined) {
    _dw = dw;
  }
  if (tl !== undefined) {
    _tl = tl;
  }
  if (tw !== undefined) {
    _tw = tw;
  }
  if (occupant !== undefined) {
    _occupant = occupant;
  }

  this.setDl = (dl) => {
    _dl = dl;
  };
  this.setDw = (dw) => {
    _dw = dw;
  };
  this.setTl = (tl) => {
    _tl = tl;
  };
  this.setTw = (tw) => {
    _tw = tw;
  };
  this.setOccupant = (occupant) => {
    _occupant = occupant;
  };

  this.getDl = () => _dl;
  this.getDw = () => _dw;
  this.getTl = () => _tl;
  this.getTw = () => _tw;
  this.getOccupant = () => _occupant;
}

const focusableTypes = {
  HAND: "hand",
  BOARD: "board",
};

export default function App() {
  const boardStateNotifier = useRef(
    new ValueNotifier(new BoardState([15, 15]))
  ).current;
  const focusNotifier = useRef(new ValueNotifier(undefined)).current;
  const weighterNotifier = useRef(new ValueNotifier({})).current;
  const handNotifier = useRef(new ValueNotifier([])).current;
  const dictionaryFetcherNotifier = useRef(new ValueNotifier(null)).current;

  function doStandardizeWeighter() {
    weighterNotifier.notifyUpdate((value) => {
      for (const key of Object.keys(value)) {
        delete value[key];
      }
      value["A"] = 1;
      value["B"] = 3;
      value["C"] = 3;
      value["D"] = 2;
      value["E"] = 1;
      value["F"] = 5;
      value["G"] = 2;
      value["H"] = 4;
      value["I"] = 1;
      value["J"] = 8;
      value["K"] = 5;
      value["L"] = 1;
      value["M"] = 3;
      value["N"] = 1;
      value["O"] = 1;
      value["P"] = 3;
      value["Q"] = 10;
      value["R"] = 1;
      value["S"] = 1;
      value["T"] = 1;
      value["U"] = 1;
      value["V"] = 4;
      value["W"] = 4;
      value["X"] = 8;
      value["Y"] = 4;
      value["Z"] = 10;
    });
  }

  function doStandardizeBoardState() {
    boardStateNotifier.notifyUpdate((value) => {
      for (let i = 0; i < 15; i++) {
        for (let j = 0; j < 15; j++) {
          const cell = value.getCell([i, j]);
          const dl =
            ((i == 3 || i == 11) && (j == 0 || j == 7 || j == 14)) ||
            ((i == 0 || i == 7 || i == 14) && (j == 3 || j == 11)) ||
            ((i == 6 || i == 8) && (j == 2 || j == 6 || j == 8 || j == 12)) ||
            ((i == 0 || i == 7 || i == 14) && (j == 3 || j == 11)) ||
            ((i == 2 || i == 6 || i == 8 || i == 12) && (j == 6 || j == 8));

          const dw =
            (i == 1 ||
              i == 2 ||
              i == 3 ||
              i == 4 ||
              i == 7 ||
              i == 10 ||
              i == 11 ||
              i == 12 ||
              i == 13) &&
            (i == j || i == 14 - j);

          const tl =
            ((i == 5 || i == 9) && (j == 1 || j == 5 || j == 9 || j == 13)) ||
            ((j == 5 || j == 9) && (i == 1 || i == 5 || i == 9 || i == 13));

          const tw =
            (i == 0 || i == 7 || i == 14) &&
            (j == 0 || j == 7 || j == 14) &&
            !(i == 7 && j == 7);

          cell.setDl(dl);
          cell.setDw(dw);
          cell.setTl(tl);
          cell.setTw(tw);
        }
      }
    });
  }

  async function doMagic() {
    const hand = handNotifier.getValue();
    const boardState = boardStateNotifier.getValue();
    const weighter = weighterNotifier.getValue();
    const dictionaryFetcher = dictionaryFetcherNotifier.getValue();

    if (dictionaryFetcher == null) {
      console.log(`NO DICTIONARY FETCHER`);
      return;
    }

    let dictionary = null;
    try {
      dictionary = await dictionaryFetcher;
    } catch (e) {
      console.log(`DICTIONARY ERROR: ${e}`);
      return;
    }

    // console.log("AAAAAAAAAA", JSON.parse(boardState.toTransferrable()));

    console.log("FETCHING...");

    const response = await fetch(
      `https://scrabbler-miner-server.onrender.com/findPlayables`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boardStateTransferrable: boardState.toTransferrable(),
          hand,
          dictionary,
          weighter,
        }),
      }
    );

    const result = await response.json();

    console.log(`RESULT...`);

    const resultKeysSorted = Array.from(
      Object.keys(result).map((item) => parseInt(item))
    ).sort((a, b) => b - a);

    let count = 0;
    for (const key of resultKeysSorted) {
      console.log(`For ${key} point(s)`);
      const resultPlayScoreEntries = result[key];
      for (const item of resultPlayScoreEntries) {
        count += 1;

        const [i, j, horizontallyElseVertically, word] = item;

        console.log(
          `${count}. ${word} @ [${i},${j}] - ${
            horizontallyElseVertically ? "HORIZONTAL" : "VERTICAL"
          }`
        );
      }
    }

    // const result = findHighestScorePlayables(
    //   boardState,
    //   hand,
    //   dictionary,
    //   weighter
    // );
    // console.log(result);
  }

  useEffect(() => {
    doStandardizeBoardState();
    doStandardizeWeighter();
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      tabIndex={-1}
      onKeyDown={(ev) => {
        // console.log(ev.key);
        if (ev.key == "Backspace") {
          const focus = focusNotifier.getValue();
          if (focus == undefined) {
            return;
          }
          if (focus[0] == focusableTypes.BOARD) {
            boardStateNotifier.notifyUpdate((value) => {
              value.getCell(focus[1]).setOccupant(undefined);
            });
            return;
          }
          if (focus[0] == focusableTypes.HAND) {
            handNotifier.notifyUpdate((value) => {
              value.splice(focus[1], 1);
            });

            const hand = handNotifier.getValue();
            if (hand.length == 0) {
              focusNotifier.setValue([focusableTypes.HAND, undefined]);
              return;
            }
            if (focus[1] >= hand.length) {
              focusNotifier.setValue([focusableTypes.HAND, hand.length - 1]);
              return;
            }
          }
          return;
        }

        if (ev.key == "ArrowLeft") {
          const focus = focusNotifier.getValue();
          if (focus != undefined && focus[0] == focusableTypes.BOARD) {
            if (focus[1] != undefined) {
              const boardState = boardStateNotifier.getValue();
              focusNotifier.setValue([
                focusableTypes.BOARD,
                [
                  focus[1][0] == 0
                    ? boardState.getSize()[0] - 1
                    : focus[1][0] - 1,
                  focus[1][1],
                ],
              ]);
            }
            return;
          }

          if (focus != undefined && focus[0] == focusableTypes.HAND) {
            if (focus[1] != undefined) {
              const hand = handNotifier.getValue();
              focusNotifier.setValue([
                focusableTypes.HAND,
                focus[1] == 0 ? hand.length - 1 : focus[1] - 1,
              ]);
            }
            return;
          }

          return;
        }

        if (ev.key == "ArrowRight") {
          const focus = focusNotifier.getValue();
          if (focus != undefined && focus[0] == focusableTypes.BOARD) {
            if (focus[1] != undefined) {
              const boardState = boardStateNotifier.getValue();
              focusNotifier.setValue([
                focusableTypes.BOARD,
                [
                  focus[1][0] == boardState.getSize()[0] - 1
                    ? 0
                    : focus[1][0] + 1,
                  focus[1][1],
                ],
              ]);
            }
            return;
          }

          if (focus != undefined && focus[0] == focusableTypes.HAND) {
            if (focus[1] != undefined) {
              const hand = handNotifier.getValue();
              focusNotifier.setValue([
                focusableTypes.HAND,
                focus[1] == hand.length - 1 ? 0 : focus[1] + 1,
              ]);
            }
            return;
          }

          return;
        }

        if (ev.key == "ArrowUp") {
          const focus = focusNotifier.getValue();
          if (focus != undefined && focus[0] == focusableTypes.BOARD) {
            if (focus[1] != undefined) {
              const boardState = boardStateNotifier.getValue();
              focusNotifier.setValue([
                focusableTypes.BOARD,
                [
                  focus[1][0],
                  focus[1][1] == 0
                    ? boardState.getSize()[1] - 1
                    : focus[1][1] - 1,
                ],
              ]);
            }
            return;
          }
          return;
        }

        if (ev.key == "ArrowDown") {
          const focus = focusNotifier.getValue();
          if (focus != undefined && focus[0] == focusableTypes.BOARD) {
            if (focus[1] != undefined) {
              const boardState = boardStateNotifier.getValue();
              focusNotifier.setValue([
                focusableTypes.BOARD,
                [
                  focus[1][0],
                  focus[1][1] == boardState.getSize()[1] - 1
                    ? 0
                    : focus[1][1] + 1,
                ],
              ]);
            }
            return;
          }
          return;
        }

        if (ev.key == "Enter") {
          doMagic();
          return;
        }

        //lastly

        const focus = focusNotifier.getValue();
        if (focus != undefined && focus[0] == focusableTypes.BOARD) {
          if (focus[1] != undefined) {
            const charUpperCased = ev.key.toUpperCase();
            const weighter = weighterNotifier.getValue();

            if (weighter[charUpperCased] != undefined) {
              const isBlank = ev.shiftKey;
              boardStateNotifier.notifyUpdate((value) => {
                value.getCell(focus[1]).setOccupant([charUpperCased, !isBlank]);
              });
            }
          }
          return;
        }

        if (focus != undefined && focus[0] == focusableTypes.HAND) {
          const charUpperCased = ev.key == " " ? null : ev.key.toUpperCase();

          const weighter = weighterNotifier.getValue();
          if (weighter[charUpperCased] != undefined || charUpperCased==null) {
            if (ev.shiftKey) {
              handNotifier.notifyUpdate((value) => {
                value.push(charUpperCased);
              });
              const hand = handNotifier.getValue();
              focusNotifier.setValue([focusableTypes.HAND, hand.length - 1]);
              return;
            }

            if (focus[1] != undefined) {
              handNotifier.notifyUpdate((value) => {
                value[focus[1]] = charUpperCased;
              });
            }
            return;
          }

          return;
        }
      }}
    >
      <div
        style={{
          width: "100%",
          height: "40px",
          padding: "10px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: 0,
            flexGrow: 1,
          }}
        >
          <ValueNotifiersListener
            valueNotifiers={[dictionaryFetcherNotifier]}
            builder={() => {
              const dictionaryFetcher = dictionaryFetcherNotifier.getValue();
              if (dictionaryFetcher == null) {
                return <>No dictionary</>;
              }
              return (
                <PromiseBuilder
                  promise={dictionaryFetcher}
                  builder={(snapshot) => {
                    if (snapshot == null) {
                      return null;
                    }

                    const [resolvedRejected, data] = snapshot;

                    if (resolvedRejected == false) {
                      return <>{`dictionary error: ${data}`}</>;
                    }

                    return <>{`${data.length} words`}</>;
                  }}
                />
              );
            }}
          />
        </div>
        <button
          onClick={async () => {
            const pickedFiles = await new Promise((resolve) => {
              const fileInput = document.createElement("input");
              fileInput.style.display = "none";
              fileInput.type = "file";
              // fileInput.multiple = true;
              document.body.appendChild(fileInput);
              fileInput.addEventListener("change", () => {
                document.body.removeChild(fileInput);
                resolve(fileInput.files);
              });
              fileInput.click();
            });

            if (!(pickedFiles.length > 0)) {
              return;
            }

            const file = pickedFiles[0];

            dictionaryFetcherNotifier.setValue(
              new Promise((resolve, reject) => {
                const fileReader = new FileReader();
                fileReader.onload = (e) => {
                  const fileContent = e.target.result;
                  resolve(fileContent.split("\n"));
                };
                fileReader.onerror = (e) => {
                  reject(e);
                };
                fileReader.readAsText(file);
              })
            );
          }}
        >
          Dictionary
        </button>
      </div>
      <div
        style={{
          width: "100%",
          height: 0,
          flexGrow: 1,
        }}
      >
        <ValueNotifiersListener
          valueNotifiers={[boardStateNotifier, focusNotifier, weighterNotifier]}
          builder={() => {
            const boardState = boardStateNotifier.getValue();
            const focus = focusNotifier.getValue();
            const weighter = weighterNotifier.getValue();

            const [boardStateSizeWidth, boardStateSizeHeight] =
              boardState.getSize();

            return (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border:
                    focus != undefined && focus[0] == focusableTypes.BOARD
                      ? "2px solid black"
                      : "2px solid white",
                }}
                onClick={() => {
                  if (focus == undefined || focus[0] != focusableTypes.BOARD) {
                    focusNotifier.setValue([focusableTypes.BOARD, undefined]);
                  }
                }}
              >
                {Array.from({ length: boardStateSizeWidth }, (value, i) => {
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {Array.from(
                        { length: boardStateSizeHeight },
                        (value, j) => {
                          const cell = boardState.getCell([i, j]);
                          const focused =
                            focus != undefined &&
                            focus[0] == focusableTypes.BOARD &&
                            focus[1] != undefined &&
                            focus[1][0] == i &&
                            focus[1][1] == j;

                          return (
                            <div
                              key={j}
                              style={{
                                width: "32px",
                                height: "32px",
                                display: "flex",
                                flexDirection: "column",
                                border: focused
                                  ? "2px solid red"
                                  : "1px solid rgba(240,240,240,1)",
                                position: "relative",
                              }}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                focusNotifier.setValue([
                                  focusableTypes.BOARD,
                                  [i, j],
                                ]);
                              }}
                            >
                              {cell.getDl() ? (
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    width: "100%",
                                    height: "100%",
                                    background: "rgba(180,180,255,1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    textAlign: "center",
                                    color: "white",
                                    fontSize: "11px",
                                  }}
                                >
                                  DL
                                </div>
                              ) : null}
                              {cell.getDw() ? (
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    width: "100%",
                                    height: "100%",
                                    background: "rgba(255,150,100,1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    textAlign: "center",
                                    color: "white",
                                    fontSize: "11px",
                                  }}
                                >
                                  DW
                                </div>
                              ) : null}
                              {cell.getTl() ? (
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    width: "100%",
                                    height: "100%",
                                    background: "rgba(80,80,155,1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    textAlign: "center",
                                    color: "white",
                                    fontSize: "11px",
                                  }}
                                >
                                  TL
                                </div>
                              ) : null}
                              {cell.getTw() ? (
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    width: "100%",
                                    height: "100%",
                                    background: "rgba(155,50,00,1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    textAlign: "center",
                                    color: "white",
                                    fontSize: "11px",
                                  }}
                                >
                                  TW
                                </div>
                              ) : null}
                              {(function () {
                                const occupant = cell.getOccupant();
                                if (occupant != undefined) {
                                  const [letter, significant] = occupant;

                                  return (
                                    <div
                                      style={{
                                        position: "absolute",
                                        left: 0,
                                        top: 0,
                                        width: "100%",
                                        height: "100%",
                                        background: significant
                                          ? "black"
                                          : "grey",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "hidden",
                                        padding: "3px",
                                        // gap: "0px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: "100%",
                                          height: 0,
                                          flexGrow: 1,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          textAlign: "center",
                                          color: "white",
                                          fontSize: "16px",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        {letter}
                                      </div>
                                      <div
                                        style={{
                                          width: "100%",
                                          display: "flex",
                                          justifyContent: "flex-end",
                                          textAlign: "right",
                                          color: "white",
                                          fontSize: "8px",
                                        }}
                                      >
                                        {significant
                                          ? weighter[letter] || 0
                                          : "X"}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          );
                        }
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
      </div>
      <div
        style={{
          width: "100%",
          height: "100px",
        }}
      >
        <ValueNotifiersListener
          valueNotifiers={[handNotifier, focusNotifier, weighterNotifier]}
          builder={() => {
            const hand = handNotifier.getValue();
            const focus = focusNotifier.getValue();
            const weighter = weighterNotifier.getValue();

            return (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border:
                    focus != undefined && focus[0] == focusableTypes.HAND
                      ? "2px solid black"
                      : "2px solid white",
                }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  if (focus == undefined || focus[0] != focusableTypes.HAND) {
                    focusNotifier.setValue([focusableTypes.HAND, undefined]);
                  }
                }}
              >
                {hand.map((item, i) => {
                  const focused =
                    focus != undefined &&
                    focus[0] == focusableTypes.HAND &&
                    focus[1] == i;
                  return (
                    <div
                      key={i}
                      style={{
                        width: "60px",
                        height: "60px",
                        display: "flex",
                        flexDirection: "column",
                        border: focused
                          ? "2px solid red"
                          : "1px solid rgba(240,240,240,1)",
                        position: "relative",
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        focusNotifier.setValue([focusableTypes.HAND, i]);
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: "100%",
                          height: "100%",
                          background: item != null ? "black" : "grey",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          padding: "3px",
                          // gap: "0px",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: 0,
                            flexGrow: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            color: "white",
                            fontSize: "30px",
                            fontWeight: "bold",
                          }}
                        >
                          {item}
                        </div>
                        <div
                          style={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "flex-end",
                            textAlign: "right",
                            color: "white",
                            fontSize: "15px",
                          }}
                        >
                          {item != null ? weighter[item] || 0 : "X"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
