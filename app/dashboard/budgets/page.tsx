// app/dashboard/budgets/page.tsx
import React from "react";
import Link from "next/link";

export default function BudgetsPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Lista de Orçamentos</h1>
      <p>
        Essa página pode ter links para cada orçamento, ex:{" "}
        <Link href="/dashboard/budgets/123">Orçamento 123</Link>
      </p>
    </main>
  );
}