import { useEffect, useState } from "react";

export default function PromiseBuilder({ promise = null, builder }) {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (promise == null) {
      return;
    }
    promise
      .then((value) => {
        setSnapshot([true, value]);
      })
      .catch((e) => {
        setSnapshot([false, e]);
      });
  }, []);

  return builder(snapshot);
}
