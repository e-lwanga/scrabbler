import { io } from "socket.io-client";

export default function FunctionRunner(resultPromise) {
  this.result = () => resultPromise;
}

export async function runRemoteHttpFunction(
  serverAddress,
  {
    boardState,
    dictionary,
    hand,
    weighter,
    dictionaryWordsStartIndex,
    dictionaryWordsIndexingCount,
  }
) {
  const response = await fetch(`${serverAddress}/function`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      boardStateTransferrable: boardState.toTransferrable(),
      hand,
      dictionary,
      weighter,
      dictionaryWordsStartIndex,
      dictionaryWordsIndexingCount,
    }),
  });
  return await response.json();
}

export function FunctionRunnerX(usePromise) {
  this.use = () => usePromise;
}

export async function createRemoteSocketFunctionRunner(serverAddress, use) {
  return await new Promise((resolve, reject) => {
    let useResolve = undefined;
    let useReject = undefined;

    const usedPromise = new Promise((resolve, reject) => {
      useResolve = resolve;
      useReject = reject;
    });

    const socket = io(`${serverAddress}/function`, {
      autoConnect: false,
      reconnection: false,
      query: {
        //....
      },
    });

    socket.on("connect", () => {
      use(
        async ({
          boardState,
          dictionary,
          hand,
          weighter,
          dictionaryWordsStartIndex,
          dictionaryWordsIndexingCount,
        }) => {
          return await new Promise((resolve, reject) => {
            try {
              socket.emit(
                "run",
                {
                  boardStateTransferrable: boardState.toTransferrable(),
                  dictionary,
                  hand,
                  weighter,
                  dictionaryWordsStartIndex,
                  dictionaryWordsIndexingCount,
                },
                (data) => {
                  resolve(data);
                }
              );
            } catch (e) {
              console.log("SOCKET.EMIT ERROR");
              reject(e);
            }
          });
        }
      )
        .then(useResolve)
        .catch(useReject)
        .finally(() => {
          socket.disconnect();
          console.log(4444444);
        });

      const functionRunner = new FunctionRunner(usedPromise);

      resolve(functionRunner);
    });

    socket.on("connect_error", (e) => {
      reject(e);
    });

    socket.on("disconnect", () => {
      useReject();
    });

    socket.connect();
  });
}
