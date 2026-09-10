import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 shadow-xl mb-4">
          <span className="text-4xl">✒️</span>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
          note<span className="text-indigo-600">-think</span>
        </h1>
        <p className="mt-3 text-lg text-gray-500 max-w-sm mx-auto">
          Your smart digital notebook, optimized for Samsung S Pen.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 gap-4 mb-10 max-w-sm w-full">
        {[
          { icon: "✒️", label: "S Pen Optimized" },
          { icon: "🤚", label: "Palm Rejection" },
          { icon: "⬜", label: "Smart Eraser" },
          { icon: "☁️", label: "Cloud Sync" },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Link
          href="/register"
          className="flex-1 text-center bg-indigo-600 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-indigo-700 transition-colors shadow-md"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="flex-1 text-center bg-white text-indigo-600 font-semibold py-3 px-6 rounded-2xl hover:bg-indigo-50 transition-colors border border-indigo-200"
        >
          Sign In
        </Link>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Works best on Samsung Galaxy Note & Tab with S Pen
      </p>
    </main>
  );
}
