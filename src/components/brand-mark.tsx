export function BrandMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="square">
        <path d="M10.5 39.5a24 24 0 0 1 4.3-23" />
        <path d="M19.2 11.7a24 24 0 0 1 17.1-5.6" />
        <path d="M44.6 8.5a24 24 0 0 1 13.2 14.1" />
        <path d="M59 31.5a24 24 0 0 1-14.4 22" />
        <path d="M35.8 58.8a24 24 0 0 1-17-6.9" />
      </g>
      <path d="M22 43V35h7v8M34 43V28h7v15M46 43V22h6v21" stroke="currentColor" strokeWidth="4" strokeLinecap="square" strokeLinejoin="round" />
      <path d="m14 48 18-18 8 7 15-18m-10 0h10v10" stroke="currentColor" strokeWidth="4" strokeLinecap="square" strokeLinejoin="round" />
    </svg>
  );
}
