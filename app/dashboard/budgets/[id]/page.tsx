"use client";

import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBudgetPdfBlob } from "@/lib/pdf/createBudgetPdf";
import Link from "next/link";

type BudgetItem = {
  id: string;
  type: "part" | "service"
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
};

export default function BudgetPage() {
  const { id: budgetId } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!budgetId) return;

    const loadBudget = async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select(
          `
          id,
          subtotal,
          discount_total,
          total,
          created_at,
          client:clients (
            id,
            name
          ),
          vehicle:vehicles (
            id,
            plate,
            model
          ),
          budget_items (
          id,
          type,
          description,
          quantity,
          unit_price,
          discount,
          total
        )
        `,
        )
        .eq("id", budgetId)
        .single();

      if (error || !data) {
        router.push("/dashboard");
        return;
      }

      setBudget(data);
      setLoading(false);
    };

    loadBudget();
  }, [budgetId, router]);

  async function handleDownloadPdf() {
    if (!budget) return;

    try {
      const blob = await createBudgetPdfBlob(budget);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `orcamento-${budget.id}.pdf`;
      a.click();

      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }
  if (loading || !budget || !budget.client || !budget.vehicle) {
    return (
      <main className="min-h-screen bg-gray-100">
        <AppHeader />
        <p className="text-center mt-20 text-black">
          Carregando dados do orçamento…
        </p>
      </main>
    );
  }

  const client = budget.client;
  const vehicle = budget.vehicle;
  const items: BudgetItem[] = budget.budget_items ?? [];

  const totalParts = items
    .filter((item) => item.type === "part")
    .reduce((sum, item) => sum + Number(item.total), 0);

  const totalLabor = items
    .filter((item) => item.type === "service")
    .reduce((sum, item) => sum + Number(item.total), 0);

  const subtotal = totalParts + totalLabor;

  const totalDiscount = items.reduce(
    (sum, item) => sum + Number(item.discount),
    0,
  );

  const totalFinal = subtotal - totalDiscount;

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />

      <section className="max-w-4xl mx-auto px-4 mt-10 space-y-8">
        {/* HEADER */}
        <header className="flex flex-wrap gap-4 justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-black">
              Orçamento #{budget.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-black">
              Criado em{" "}
              {new Date(budget.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-4 py-2 rounded-md bg-black text-white cursor-pointer hover:bg-gray-800 disabled:opacity-50"
            >
              {downloading ? "Gerando PDF..." : "Baixar PDF"}
            </button>

            <Link
              href={`/dashboard/budgets/${budget.id}/print`}
              className="px-4 py-2 rounded-md bg-gray-800 text-white hover:bg-gray-700"
            >
              Imprimir
            </Link>

            <Link
              href={`/dashboard/vehicles/${vehicle.id}`}
              className="px-4 py-2 rounded-md bg-gray-200 text-black hover:bg-gray-300"
            >
              Voltar para veículo
            </Link>
          </div>
        </header>

        {/* CLIENT / VEHICLE */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid md:grid-cols-2 gap-4 text-black">
            <div>
              <p className="text-sm text-black">Cliente</p>
              <p className="font-medium">{client.name}</p>
            </div>

            <div>
              <p className="text-sm text-black">Veículo</p>
              <p className="font-medium">
                {vehicle.plate} — {vehicle.model}
              </p>
            </div>
          </div>
        </div>

        {/* ITEMS */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-black mb-4">
            Itens do orçamento
          </h2>

          <table className="w-full text-sm text-black">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Descrição</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th>Desc.</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>R$ {item.unit_price.toFixed(2)}</td>
                  <td>R$ {item.discount.toFixed(2)}</td>
                  <td className="text-right font-medium">
                    R$ {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY */}
        <div className="bg-white rounded-lg shadow p-6 space-y-2 text-black">
          <div className="flex justify-between">
            <span>Total de Peças</span>
            <span>R$ {totalParts.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>Total Mão de Obra</span>
            <span>R$ {totalLabor.toFixed(2)}</span>
          </div>

          <div className="flex justify-between border-t pt-2">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>Descontos</span>
            <span>R$ {totalDiscount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-semibold text-lg border-t pt-2">
            <span>Total</span>
            <span>R$ {totalFinal.toFixed(2)}</span>
          </div>
        </div>
      </section>
    </main>
  );
}

