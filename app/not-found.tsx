"use client";
import { unstable_noStore as noStore } from "next/cache";

export default function NotFound() {
  noStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600">Page not found</p>
      </div>
    </div>
  );
}
