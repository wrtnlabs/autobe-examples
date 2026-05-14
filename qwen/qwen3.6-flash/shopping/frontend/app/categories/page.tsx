"use client";

import { useEffect, useState } from "react";
import { index } from "../../lib/sdk/shopCategories";
import type { IEcommerceMallShopCategory } from "../../api/structures/IEcommerceMallShopCategory";

type Summary = IEcommerceMallShopCategory.ISummary;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    index({})
      .then((page) => {
        setCategories(page.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-sm text-gray-500">Loading categories…</p>
      </main>
    );
  }
  if (error) {
    return (
      <main className="p-6">
        <p className="text-sm text-red-600">Error: {error}</p>
      </main>
    );
  }

  const roots = categories.filter((c) => c.parentCategory === null);
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parentCategory?.id === parentId);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Shop Categories</h1>
        <p className="mt-1 text-sm text-gray-600">
          {categories.length} total · {roots.length} root ·{" "}
          {categories.length - roots.length} sub
        </p>
      </header>

      <ul className="space-y-4">
        {roots.map((root) => {
          const children = childrenOf(root.id);
          return (
            <li
              key={root.id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-semibold">{root.name}</h2>
                <span className="text-xs text-gray-500">
                  {root.sub_categories_count} sub · updated{" "}
                  {root.updated_at.slice(0, 10)}
                </span>
              </div>
              {root.description !== null && (
                <p className="mt-1 text-sm text-gray-700">{root.description}</p>
              )}
              {children.length > 0 && (
                <ul className="mt-3 ml-4 border-l border-gray-200 pl-4 space-y-2">
                  {children.map((child) => (
                    <li key={child.id} className="text-sm">
                      <span className="font-medium">{child.name}</span>
                      {child.description !== null && (
                        <span className="text-gray-600">
                          {" · "}
                          {child.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <footer className="mt-8 text-xs text-gray-400">
        Mock data via <code className="font-mono">lib/sdk/mock/store.ts</code>.
        simulate=true is on; no real backend.
      </footer>
    </main>
  );
}
