import { Suspense } from "react";
import NewBudgetClient from "@/app/dashboard/budgets/new/NewBudgetClient";

export default function Page() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <NewBudgetClient />
    </Suspense>
  );
}