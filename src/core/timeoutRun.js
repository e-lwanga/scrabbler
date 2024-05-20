export default function timeoutRun(runner, time, timeoutCallback = null) {
  return new Promise((resolve, reject) => {
    let completed = false;
    runner()
      .then((v) => {
        completed = true;
        resolve(v);
      })
      .catch((e) => {
        completed = true;
        reject(e);
      });
    setTimeout(() => {
      if (!completed) {
        reject();
        if (timeoutCallback != null) {
          timeoutCallback();
        }
      }
    }, time);
  });
}
