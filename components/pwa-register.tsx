"use client";

import { useEffect, useState } from "react";

export default function PwaRegister() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker 注册失败:", err);
      });
    }
    const update = () => setOffline(!navigator.onLine);
    setOffline(!navigator.onLine);
    window.addEventListener("offline", update);
    window.addEventListener("online", update);
    return () => {
      window.removeEventListener("offline", update);
      window.removeEventListener("online", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-amber-500/95 px-4 py-2 text-center text-xs font-medium text-amber-950">
      当前处于离线状态，部分功能不可用，联网后自动恢复
    </div>
  );
}
