import Link from "next/link";
import { Activity, BookOpen, CheckCircle2, Moon, Target, WalletCards } from "lucide-react";
import { signIn, signUp } from "@/features/auth/actions";
import { BrandMark } from "@/components/brand-mark";

const focusAreas = [
  { label: "Habits", icon: CheckCircle2 },
  { label: "Mood", icon: Activity },
  { label: "Sleep", icon: Moon },
  { label: "Fitness", icon: Activity },
  { label: "Spending", icon: WalletCards },
  { label: "Goals", icon: Target },
  { label: "Journal", icon: BookOpen },
  { label: "Reading", icon: BookOpen },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; mode?: string }> }) {
  const params = await searchParams;
  const isLogin = params.mode === "login";

  return <main className="min-h-screen bg-[#f3f5ff] text-[#171b35]">
    <header className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-6 sm:px-10 lg:px-14">
      <Link href="/login" className="flex items-center gap-3" aria-label="Life Tracker home">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#4d45e8] text-white shadow-lg shadow-[#4d45e8]/20"><BrandMark className="h-7 w-7" /></span>
        <span className="text-[21px] font-bold tracking-[-.04em]">Life Tracker</span>
      </Link>
      <p className="text-sm text-[#525b7c]">{isLogin ? "New to Life Tracker?" : "Have an account?"} <Link href={isLogin ? "/login" : "/login?mode=login"} className="font-semibold text-[#4d45e8] underline underline-offset-2">{isLogin ? "Create account" : "Log in"}</Link></p>
    </header>

    <div className="mx-auto grid max-w-[1600px] gap-10 px-6 pb-12 pt-6 sm:px-10 lg:grid-cols-[1.15fr_.85fr] lg:gap-14 lg:px-14 lg:pt-10">
      <section className="pt-2 lg:pt-0">
        <div className="mb-9 flex items-center gap-3 text-sm font-medium text-[#505a7e]"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#4d45e8] text-white">1</span><span className="text-[#171b35]">Choose what matters</span><span className="mx-1 h-px w-10 bg-[#c5cbea]"/><span className="grid h-9 w-9 place-items-center rounded-full border border-[#9ba6cf] text-[#525b7c]">2</span><span>{isLogin ? "Welcome back" : "Create account"}</span></div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#5a55db]">A little progress, every day</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl xl:text-[64px]">Make room for the life you want.</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#596281] sm:text-lg">Build steady habits, keep your thoughts close, work toward goals, and feel in control of your spending.</p>
        <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {focusAreas.map(({ label, icon: Icon }, index) => <div key={label} className={`flex min-h-[74px] items-center gap-4 rounded-2xl border bg-white px-4 py-3 shadow-[0_8px_24px_-24px_rgba(35,45,95,.35)] transition sm:min-h-[86px] sm:px-5 ${index === 0 ? "border-[#756ff0] ring-2 ring-[#756ff0]/10" : "border-[#dce1f6]"}`}><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f0f1ff] text-[#505985]"><Icon size={21} strokeWidth={1.8}/></span><span className="text-base font-medium">{label}</span></div>)}
        </div>
        <div className="mt-8 hidden items-center gap-3 text-xs text-[#6b7391] lg:flex"><span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#4d45e8]"><BrandMark className="h-6 w-6"/></span>Private by design · Your progress belongs to you</div>
      </section>

      <section className="h-fit rounded-[28px] border border-[#dfe3f5] bg-white p-6 shadow-[0_24px_70px_-45px_rgba(42,50,104,.35)] sm:p-9 lg:p-10">
        <h2 className="text-3xl font-semibold tracking-[-.035em]">{isLogin ? "Welcome back" : "Create your account"}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#596281]">{isLogin ? "Log in to continue building a life that feels like yours." : "Start with one small step. You can change what you track at any time."}</p>
        {params.error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{params.error}</p>}
        {params.message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{params.message}</p>}
        <form action={isLogin ? signIn : signUp} className="mt-7 space-y-4">
          {!isLogin && <label className="block text-sm font-medium">Name <span className="font-normal text-[#858ca4]">· optional</span><input name="name" type="text" autoComplete="name" placeholder="Your name" className="mt-2 h-12 w-full rounded-xl border border-[#aeb7dc] bg-white px-4 text-sm outline-none transition placeholder:text-[#8a8a8a] focus:border-[#5149e8] focus:ring-2 focus:ring-[#5149e8]/15"/></label>}
          <label className="block text-sm font-medium">Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="mt-2 h-12 w-full rounded-xl border border-[#aeb7dc] bg-white px-4 text-sm outline-none transition placeholder:text-[#8a8a8a] focus:border-[#5149e8] focus:ring-2 focus:ring-[#5149e8]/15"/></label>
          <label className="block text-sm font-medium">Password<input name="password" type="password" required minLength={isLogin ? undefined : 8} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? "Your password" : "At least 8 characters"} className="mt-2 h-12 w-full rounded-xl border border-[#aeb7dc] bg-white px-4 text-sm outline-none transition placeholder:text-[#8a8a8a] focus:border-[#5149e8] focus:ring-2 focus:ring-[#5149e8]/15"/></label>
          <button className="mt-1 w-full rounded-xl bg-[#5147e9] py-4 text-sm font-semibold text-white shadow-lg shadow-[#5147e9]/15 transition hover:bg-[#4338d9]">{isLogin ? "Log in" : "Create account"}</button>
        </form>
        <p className="mt-5 text-center text-xs leading-relaxed text-[#68708d]">By continuing, you agree to use Life Tracker responsibly. Your account and personal data are private to you.</p>
        <div className="mt-6 border-t border-[#e9ebf6] pt-5 text-center text-sm text-[#596281]">{isLogin ? "Need an account?" : "Already have an account?"} <Link href={isLogin ? "/login" : "/login?mode=login"} className="font-semibold text-[#4d45e8] hover:underline">{isLogin ? "Sign up" : "Log in"}</Link></div>
      </section>
    </div>
  </main>;
}
