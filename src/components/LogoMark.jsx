export default function LogoMark({ size = 24, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M20 3.2 5.8 8.8V19c0 8.5 5.7 14.9 14.2 18 8.5-3.1 14.2-9.5 14.2-18V8.8L20 3.2Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M9.6 12.5 20 8.2l10.4 4.3" stroke="currentColor" strokeWidth="1.4" opacity="0.5" strokeLinecap="round" />
      <path d="M22.6 9.8 13.6 21.4h6.2l-1.7 8.8 9.8-13.2h-6.2l2.9-7.2Z" fill="currentColor" />
    </svg>
  )
}
