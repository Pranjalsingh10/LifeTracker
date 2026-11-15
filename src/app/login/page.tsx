import { signIn, signUp } from "@/features/auth/actions";
import { Flower2 } from "lucide-react";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-[#111214] px-4 text-zinc-100">
    <div className="w-full max-w-md rounded-2xl border border-white/[.08] bg-[#17181b] p-7">
      <div className="mb-7 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#342d28] text-[#f5aa71]"><Flower2 size={19}/></span><span className="font-semibold">Life Tracker</span></div>
      <h1 className="text-2xl font-semibold">Welcome back</h1><p className="mt-2 text-sm text-zinc-400">Sign in or create an account to keep your habits private.</p>
      {params.error && <p role="alert" className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{params.error}</p>}
      {params.message && <p role="status" className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{params.message}</p>}
      <form action={signIn} className="mt-6 space-y-3">
        <h2 className="text-sm font-medium text-zinc-300">Sign in</h2>
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className="h-11 w-full rounded-lg border border-white/[.09] bg-[#131416] px-3 text-sm outline-none focus:border-violet-400/60" />
        <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className="h-11 w-full rounded-lg border border-white/[.09] bg-[#131416] px-3 text-sm outline-none focus:border-violet-400/60" />
        <button className="w-full rounded-lg bg-[#f28b55] py-2.5 text-sm font-semibold text-[#211915] hover:bg-[#ffa36d]">Sign in</button>
      </form>
      <form action={signUp} className="mt-7 space-y-3 border-t border-white/[.07] pt-5">
        <h2 className="text-sm font-medium text-zinc-300">Create account</h2>
        <input name="name" type="text" autoComplete="name" placeholder="Name (optional)" className="h-11 w-full rounded-lg border border-white/[.09] bg-[#131416] px-3 text-sm outline-none focus:border-violet-400/60" />
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className="h-11 w-full rounded-lg border border-white/[.09] bg-[#131416] px-3 text-sm outline-none focus:border-violet-400/60" />
        <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Password (8+ characters)" className="h-11 w-full rounded-lg border border-white/[.09] bg-[#131416] px-3 text-sm outline-none focus:border-violet-400/60" />
        <button className="w-full rounded-lg border border-white/10 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[.04]">Create account</button>
      </form>
    </div>
  </main>;
}
