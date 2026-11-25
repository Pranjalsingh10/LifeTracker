import Link from "next/link";
import { Activity, BookOpen, CheckCircle2, Moon, Target, WalletCards } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LoginThemeSwitch } from "@/features/auth/components/login-theme-switch";
import { signIn, signUp } from "@/features/auth/actions";

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

  return <main className="auth-shell">
    <header className="auth-header">
      <Link href="/login" className="auth-brand" aria-label="Life Tracker home">
        <span className="auth-brand-mark"><BrandMark className="h-7 w-7"/></span>
        <span className="auth-brand-name">Life Tracker</span>
      </Link>
      <div className="auth-header-actions"><LoginThemeSwitch/><p>{isLogin ? "New to Life Tracker?" : "Have an account?"} <Link href={isLogin ? "/login" : "/login?mode=login"}>{isLogin ? "Create account" : "Log in"}</Link></p></div>
    </header>

    <div className="auth-layout">
      <section className="auth-intro">
        <div className="auth-steps"><span className="auth-step-active">1</span><span className="auth-step-current">Choose what matters</span><span className="auth-step-rule"/><span className="auth-step-number">2</span><span>{isLogin ? "Welcome back" : "Create account"}</span></div>
        <p className="auth-eyebrow">A little progress, every day</p>
        <h1>Make room for the life you want.</h1>
        <p className="auth-description">Build steady habits, keep your thoughts close, work toward goals, and feel in control of your spending.</p>
        <div className="auth-focus-grid">
          {focusAreas.map(({ label, icon: Icon }, index) => <div key={label} className={`auth-focus-card ${index === 0 ? "is-selected" : ""}`}><span className="auth-focus-icon"><Icon size={21} strokeWidth={1.8}/></span><span>{label}</span></div>)}
        </div>
        <div className="auth-privacy"><span><BrandMark className="h-5 w-5"/></span>Private by design · Your progress belongs to you</div>
      </section>

      <section className="auth-card">
        <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
        <p className="auth-card-description">{isLogin ? "Log in to continue building a life that feels like yours." : "Start with one small step. You can change what you track at any time."}</p>
        {params.error && <p role="alert" className="auth-message auth-error">{params.error}</p>}
        {params.message && <p role="status" className="auth-message auth-success">{params.message}</p>}
        <form action={isLogin ? signIn : signUp} className="auth-form">
          {!isLogin && <label>Name <span className="auth-optional">· optional</span><input name="name" type="text" autoComplete="name" placeholder="Your name"/></label>}
          <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com"/></label>
          <label>Password<input name="password" type="password" required minLength={isLogin ? undefined : 8} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? "Your password" : "At least 8 characters"}/></label>
          <button type="submit" className="auth-submit">{isLogin ? "Log in" : "Create account"}</button>
        </form>
        <p className="auth-terms">By continuing, you agree to use Life Tracker responsibly. Your account and personal data are private to you.</p>
        <div className="auth-card-footer">{isLogin ? "Need an account?" : "Already have an account?"} <Link href={isLogin ? "/login" : "/login?mode=login"}>{isLogin ? "Sign up" : "Log in"}</Link></div>
      </section>
    </div>
  </main>;
}
