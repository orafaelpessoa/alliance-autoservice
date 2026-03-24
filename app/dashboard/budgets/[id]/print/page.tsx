"use client";

import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type BudgetItem = {
  id: string;
  type: "part" | "service";
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
};

export default function BudgetPrintPage() {
  const { id: budgetId } = useParams<{ id: string }>();
  const router = useRouter();

  const [budget, setBudget] = useState<any>(null);

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
        `
        )
        .eq("id", budgetId)
        .single();

      if (error || !data) {
        router.push("/dashboard");
        return;
      }

      setBudget(data);
    };

    loadBudget();
  }, [budgetId, router]);

  if (!budget || !budget.client || !budget.vehicle) {
    return (
      <main className="min-h-screen bg-gray-100">
        <AppHeader />
        <p className="text-center mt-20 text-black">Carregando...</p>
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
  const totalDiscount = items.reduce((sum, item) => sum + Number(item.discount), 0);
  const totalFinal = subtotal - totalDiscount;

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />
      <section className="max-w-4xl mx-auto px-4 mt-10 bg-white p-6 rounded-lg shadow">
        <header className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Orçamento #{budget.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-black">
              Criado em {new Date(budget.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
          >
            Imprimir
          </button>
        </header>

        {/* CLIENTE / VEÍCULO */}
        <div className="mb-6">
          <p className="text-black font-semibold">Cliente:</p>
          <p className="text-black">{client.name}</p>

          <p className="text-black font-semibold mt-2">Veículo:</p>
          <p className="text-black">{vehicle.plate} — {vehicle.model}</p>

          <p className="text-black font-semibold mt-2">Data:</p>
          <p className="text-black">
            {new Date(budget.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* ITENS */}
        <table className="w-full text-sm text-black mb-6 border-collapse border border-black">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2 text-left border-b border-black">Descrição</th>
              <th className="py-2 border-b border-black">Qtd</th>
              <th className="py-2 border-b border-black">Preço</th>
              <th className="py-2 border-b border-black">Desc.</th>
              <th className="py-2 border-b border-black">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-black">
                <td className="py-1">{item.description}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">R$ {item.unit_price.toFixed(2)}</td>
                <td className="text-right">R$ {item.discount.toFixed(2)}</td>
                <td className="text-right">R$ {item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* RESUMO */}
        <div className="space-y-2">
          <div className="flex justify-between text-black">
            <span>Total de Peças</span>
            <span>R$ {totalParts.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-black">
            <span>Total Mão de Obra</span>
            <span>R$ {totalLabor.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-black border-t pt-2">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-black">
            <span>Descontos</span>
            <span>R$ {totalDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-black font-semibold text-lg border-t pt-2">
            <span>Total</span>
            <span>R$ {totalFinal.toFixed(2)}</span>
          </div>
        </div>
      </section>
    </main>
  );
}