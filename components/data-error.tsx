export default function DataError({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-center">
        <p className="text-sm text-rose-300">{message}</p>
        <p className="mt-2 text-xs text-zinc-500">
          参见 README「更新数据库」部分
        </p>
      </div>
    </main>
  );
}
