export default async function findHighestScorePlayables(
  boardState,
  hand,
  dictionary,
  weighter
) {
  console.log("FINDING HIGHEST SCORE PLAYABLES");

  const [boardStateSizeWidth, boardStateSizeHeight] = boardState.getSize();

  const boardCenterX = (boardStateSizeWidth - 1) / 2;
  const boardCenterY = (boardStateSizeHeight - 1) / 2;

  const boardHorizontalCells = [
    Math.floor(boardCenterX, Math.ceil(boardCenterX)),
  ];
  const boardVerticalCells = [
    Math.floor(boardCenterY, Math.ceil(boardCenterY)),
  ];

  function getOnboardSequencialOccupantsToTheLeftOf([x, y]) {
    const occupants = [];

    while (true) {
      if (x <= 0) {
        break;
      }
      x = x - 1;
      const occupant = boardState.getCell([x, y]).getOccupant();
      if (occupant == null) {
        break;
      }
      occupants.splice(0, 0, occupant[0]);
    }

    return occupants;
  }

  function getOnboardSequencialOccupantsToTheRightOf([x, y]) {
    const occupants = [];

    while (true) {
      if (x >= boardStateSizeWidth - 1) {
        break;
      }
      x = x + 1;
      const occupant = boardState.getCell([x, y]).getOccupant();
      if (occupant == null) {
        break;
      }
      occupants.push(occupant[0]);
    }

    return occupants;
  }
  function getOnboardSequencialOccupantsToTheTopOf([x, y]) {
    const occupants = [];

    while (true) {
      if (y <= 0) {
        break;
      }
      y = y - 1;
      const occupant = boardState.getCell([x, y]).getOccupant();
      if (occupant == null) {
        break;
      }
      occupants.splice(0, 0, occupant[0]);
    }

    return occupants;
  }

  function getOnboardSequencialOccupantsToTheBottomOf([x, y]) {
    const occupants = [];

    while (true) {
      if (y >= boardStateSizeHeight - 1) {
        break;
      }
      y = y + 1;
      const occupant = boardState.getCell([x, y]).getOccupant();
      if (occupant == null) {
        break;
      }
      occupants.push(occupant[0]);
    }

    return occupants;
  }

  const result = new Map();

  for (let a = 0; a < dictionary.length; a++) {
    const word = dictionary[a];

    // if (a >= 10000) {
    //   break;
    // }

    console.log(a, word);

    for (let i = 0; i < boardStateSizeWidth; i++) {
      for (let j = 0; j < boardStateSizeHeight; j++) {
        //using starting point i,j

        (function horizontally() {
          if (i + word.length >= boardStateSizeWidth) {
            return;
          }

          const charsToTheLeftOfWord = getOnboardSequencialOccupantsToTheLeftOf(
            [i, j]
          );
          const charsToTheRightOfWord =
            getOnboardSequencialOccupantsToTheRightOf([i + word.length - 1, j]);

          if (
            charsToTheLeftOfWord.length > 0 ||
            charsToTheRightOfWord.length > 0
          ) {
            // console.log(`horizontally ${i},${j} - WORD HAS BIGGER TESTER`);
            return;
          }

          let wordValuing = 0;
          let wordValuingMultiplier = 1;

          let formedCrossWordsScore = 0;

          let wordJoinsWithOnboardOccupants = false;

          const handDeducer = [...hand];

          for (let k = 0; k < word.length; k++) {
            const char = word.charAt(k);

            ///......
            const cell = boardState.getCell([i + k, j]);
            const occupant = cell.getOccupant();

            let charExistedOnBoardAlready = false;
            let charValuingIsSignificant = true;

            if (occupant != null) {
              if (occupant[0] != char) {
                // console.log(
                //   `horizontally ${i},${j} - - WORD[${k}] => ${char} CELL PREOCCUPIER MISMATCH (${occupant[0]})`
                // );
                return;
              }
              charExistedOnBoardAlready = true;
              wordJoinsWithOnboardOccupants = true;
              if (occupant[1] == false) {
                charValuingIsSignificant = false;
              }
            }

            if (!charExistedOnBoardAlready) {
              let charIndexInHandDeducer = handDeducer.indexOf(char);
              if (!(charIndexInHandDeducer >= 0)) {
                charIndexInHandDeducer = handDeducer.indexOf(null);
                if (!(charIndexInHandDeducer >= 0)) {
                  // console.log(
                  //   `horizontally ${i},${j} - WORD[${k}] => ${char} UNPLAYABLE`
                  // );
                  return;
                }
                charValuingIsSignificant = false;
              }
              handDeducer.splice(charIndexInHandDeducer, 1);
            }

            if (hand.length == handDeducer.length) {
              return;
            }

            const charValuing = charValuingIsSignificant
              ? weighter[char] || 0
              : 0;

            let charValuingMultiplier = 1;

            let formedCrossWordValuing = 0;

            let formedCrossWordValuingMultiplier = 1;

            if (!charExistedOnBoardAlready) {
              if (cell.getDl()) {
                charValuingMultiplier *= 2;
              }
              if (cell.getTl()) {
                charValuingMultiplier *= 3;
              }

              if (cell.getDw()) {
                wordValuingMultiplier *= 2;
                formedCrossWordValuingMultiplier *= 2;
              }
              if (cell.getTw()) {
                wordValuingMultiplier *= 3;
                formedCrossWordValuingMultiplier *= 3;
              }

              const charsToTheTopOfChar =
                getOnboardSequencialOccupantsToTheTopOf([i + k, j]);
              const charsToTheBottomOfChar =
                getOnboardSequencialOccupantsToTheBottomOf([i + k, j]);

              if (
                charsToTheTopOfChar.length > 0 ||
                charsToTheBottomOfChar.length > 0
              ) {
                const formedCrossWord = `${charsToTheTopOfChar.join()}${char}${charsToTheBottomOfChar.join()}`;

                if (!(dictionary.indexOf(formedCrossWord) >= 0)) {
                  // console.log(
                  //   `horizontally ${i},${j} - WORD[${k}] => ${char} INVALID FORMED CROSSWORD ${formedCrossWord}`
                  // );
                  return;
                }

                let baseCharsValuing = 0;
                for (let m = 0; m < formedCrossWord.length; m++) {
                  const baseChar = formedCrossWord.charAt(m);

                  const significant =
                    m != charsToTheTopOfChar.length &&
                    boardState
                      .getCell([i + k, j - charsToTheTopOfChar.length + m])
                      .getOccupant()[1] == true;

                  if (significant) {
                    baseCharsValuing += weighter[baseChar] || 0;
                  }
                }

                formedCrossWordValuing +=
                  baseCharsValuing + charValuing * charValuingMultiplier;

                wordJoinsWithOnboardOccupants = true;
              }
            }

            wordValuing += charValuing * charValuingMultiplier;

            formedCrossWordsScore +=
              formedCrossWordValuing * formedCrossWordValuingMultiplier;
          }

          if (!wordJoinsWithOnboardOccupants) {
            const wordTouchesCenter =
              (i <= boardHorizontalCells[0] || i <= boardHorizontalCells[1]) &&
              (i + word.length >= boardHorizontalCells[0] ||
                i + word.length >= boardHorizontalCells[1]) &&
              (j == boardVerticalCells[0] || j == boardVerticalCells[1]);
            if (!wordTouchesCenter) {
              // console.log(
              //   `horizontally ${i},${j} - NEITHER FORMS ANY CROSSWORDS NOR TOUCHES CENTER`
              // );
              return;
            }
          }

          //do final
          const isBingo = hand.length == 7 && handDeducer.length == 0;

          const playScore =
            wordValuing * wordValuingMultiplier +
            formedCrossWordsScore +
            (isBingo ? 50 : 0);

          if (result[playScore] == undefined) {
            result[playScore] = [];
          }

          const resultPlayScoreEntries = result[playScore];
          resultPlayScoreEntries.push([i, j, true, word]);
        })();

        //...................................
        //..................................

        (function vertically() {
          if (j + word.length >= boardStateSizeHeight) {
            return;
          }

          const charsToTheTopOfWord = getOnboardSequencialOccupantsToTheTopOf([
            i,
            j,
          ]);
          const charsToTheBottomOfWord =
            getOnboardSequencialOccupantsToTheBottomOf([
              i,
              j + word.length - 1,
            ]);

          if (
            charsToTheTopOfWord.length != 0 ||
            charsToTheBottomOfWord.length != 0
          ) {
            // console.log(`vertically ${i},${j} - WORD HAS BIGGER TESTER`);
            return;
          }

          let wordValuing = 0;
          let wordValuingMultiplier = 1;

          let formedCrossWordsScore = 0;

          let wordJoinsWithOnboardOccupants = false;

          const handDeducer = [...hand];

          for (let k = 0; k < word.length; k++) {
            const char = word.charAt(k);

            ///......
            const cell = boardState.getCell([i, j + k]);
            const occupant = cell.getOccupant();

            let charExistedOnBoardAlready = false;
            let charValuingIsSignificant = true;

            if (occupant != null) {
              if (occupant[0] != char) {
                // console.log(
                //   `vertically ${i},${j} - - WORD[${k}] => ${char} CELL PREOCCUPIER MISMATCH (${occupant[0]})`
                // );
                return;
              }
              charExistedOnBoardAlready = true;
              wordJoinsWithOnboardOccupants = true;
              if (occupant[1] == false) {
                charValuingIsSignificant = false;
              }
            }

            if (!charExistedOnBoardAlready) {
              let charIndexInHandDeducer = handDeducer.indexOf(char);
              if (!(charIndexInHandDeducer >= 0)) {
                charIndexInHandDeducer = handDeducer.indexOf(null);
                if (!(charIndexInHandDeducer >= 0)) {
                  // console.log(
                  //   `vertically ${i},${j} - WORD[${k}] => ${char} UNPLAYABLE`
                  // );
                  return;
                }
                charValuingIsSignificant = false;
              }
              handDeducer.splice(charIndexInHandDeducer, 1);
            }

            if (hand.length == handDeducer.length) {
              return;
            }

            const charValuing = charValuingIsSignificant
              ? weighter[char] || 0
              : 0;

            let charValuingMultiplier = 1;

            let formedCrossWordValuing = 0;

            let formedCrossWordValuingMultiplier = 1;

            if (!charExistedOnBoardAlready) {
              if (cell.getDl()) {
                charValuingMultiplier *= 2;
              }
              if (cell.getTl()) {
                charValuingMultiplier *= 3;
              }

              if (cell.getDw()) {
                wordValuingMultiplier *= 2;
                formedCrossWordValuingMultiplier *= 2;
              }
              if (cell.getTw()) {
                wordValuingMultiplier *= 3;
                formedCrossWordValuingMultiplier *= 3;
              }

              const charsToTheLeftOfChar =
                getOnboardSequencialOccupantsToTheLeftOf([i, j + k]);
              const charsToTheRightOfChar =
                getOnboardSequencialOccupantsToTheRightOf([i, j + k]);

              if (
                charsToTheLeftOfChar.length > 0 ||
                charsToTheRightOfChar.length > 0
              ) {
                const formedCrossWord = `${charsToTheLeftOfChar.join()}${char}${charsToTheRightOfChar.join()}`;

                if (!(dictionary.indexOf(formedCrossWord) >= 0)) {
                  // console.log(
                  //   `vertically ${i},${j} - WORD[${k}] => ${char} INVALID FORMED CROSSWORD ${formedCrossWord}`
                  // );
                  return;
                }

                let baseCharsValuing = 0;
                for (let m = 0; m < formedCrossWord.length; m++) {
                  const baseChar = formedCrossWord.charAt(m);

                  const significant =
                    m != charsToTheLeftOfChar.length &&
                    boardState
                      .getCell([i - charsToTheLeftOfChar.length + m, j + k])
                      .getOccupant()[1] == true;

                  if (significant) {
                    baseCharsValuing += weighter[baseChar] || 0;
                  }
                }

                formedCrossWordValuing +=
                  baseCharsValuing + charValuing * charValuingMultiplier;

                wordJoinsWithOnboardOccupants = true;
              }
            }

            wordValuing += charValuing * charValuingMultiplier;

            formedCrossWordsScore +=
              formedCrossWordValuing * formedCrossWordValuingMultiplier;
          }

          if (!wordJoinsWithOnboardOccupants) {
            const wordTouchesCenter =
              (j <= boardVerticalCells[0] || j <= boardVerticalCells[1]) &&
              (j + word.length >= boardVerticalCells[0] ||
                j + word.length >= boardVerticalCells[1]) &&
              (i == boardHorizontalCells[0] || i == boardHorizontalCells[1]);

            if (!wordTouchesCenter) {
              // console.log(
              //   `vertically ${i},${j} - NEITHER FORMS ANY CROSSWORDS NOR TOUCHES CENTER`
              // );
              return;
            }
          }

          //do final
          const isBingo = hand.length == 7 && handDeducer.length == 0;

          const playScore =
            wordValuing * wordValuingMultiplier +
            formedCrossWordsScore +
            (isBingo ? 50 : 0);

          if (result[playScore] == undefined) {
            result[playScore] = [];
          }

          const resultPlayScoreEntries = result[playScore];
          resultPlayScoreEntries.push([i, j, false, word]);
        })();
      }
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 1);
    });
  }

  console.log(`RESULT...`);

  const resultKeysSorted = Array.from(Object.keys(result).map((item)=>parseInt(item))).sort((a, b) => b - a);

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
}
