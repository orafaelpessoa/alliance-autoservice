"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

type Client = {
  id: string;
  name: string;
  phone: string | null;
};

type Vehicle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  client: Client | null;
};

type BudgetItem = {
  id: string;
  description: string;
};

type Budget = {
  id: string;
  created_at: string;
  total: number;
  budget_items: BudgetItem[];
};

// Alterado para bater com a estrutura da tabela service_orders
type ServiceOrder = {
  id: string;
  created_at: string;
  budget_id: string;
  total: number;
  budgets: {
    total: number;
    budget_items: {
      id: string;
      description: string;
    }[];
  } | null;
};

export default function VehiclePage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [services, setServices] = useState<ServiceOrder[]>([]); // Mudado para ServiceOrder
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!vehicleId) return;
    loadAll();
  }, [vehicleId]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadVehicle(), loadBudgets(), loadServices()]);
    setLoading(false);
  }

  async function loadVehicle() {
    const { data } = await supabase
      .from("vehicles")
      .select(
        `
        id, plate, brand, model, year,
        client:clients ( id, name, phone )
      `,
      )
      .eq("id", vehicleId)
      .single();

    if (!data) return;

    setVehicle({
      id: data.id,
      plate: data.plate,
      brand: data.brand,
      model: data.model,
      year: data.year,
      client: Array.isArray(data.client)
        ? (data.client[0] ?? null)
        : ((data.client as any) ?? null),
    });
  }

  async function loadBudgets() {
    const { data } = await supabase
      .from("budgets")
      .select(`id, created_at, total, budget_items ( id, description )`)
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });

    if (data) setBudgets(data);
  }

  async function loadServices() {
    // Filtro .neq("status", "canceled") adicionado para ocultar as canceladas
    const { data } = await supabase
      .from("service_orders")
      .select(
        `
        id, 
        created_at, 
        budget_id,
        total,
        status,
        budgets (
          total,
          budget_items ( id, description )
        )
      `,
      )
      .eq("vehicle_id", vehicleId)
      .neq("status", "canceled") // Esta linha resolve o seu problema
      .order("created_at", { ascending: false });

    if (data) {
      const formattedServices: ServiceOrder[] = data.map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        budget_id: item.budget_id,
        total: item.total,
        budgets: Array.isArray(item.budgets) ? item.budgets[0] : item.budgets,
      }));

      setServices(formattedServices);
    }
  }

  function formatMoney(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  async function handleRegisterService(budgetId: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc(
        "register_budget_as_service_order",
        {
          p_budget_id: budgetId,
          p_user_id: user.id,
        },
      );

      if (error) throw error;

      // Recarrega tudo para atualizar o layout e o modal
      await Promise.all([loadBudgets(), loadServices()]);
      setShowModal(false);
    } catch (err: any) {
      alert(
        err.message.includes("já convertido")
          ? "Este orçamento já foi registrado como OS."
          : "Erro ao registrar serviço.",
      );
    }
  }

  // Lista de IDs de orçamentos que já possuem uma OS vinculada
  const usedBudgetIds = services.map((s) => s.budget_id);

  if (loading || !vehicle) {
    return <div className="p-8 text-center text-black">Carregando...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />

      <section className="max-w-5xl mx-auto mt-8 space-y-6 px-4 pb-10">
        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold text-black mb-2">
            Informações do Veículo
          </h2>
          <p className="text-black">
            <strong>Placa:</strong> {vehicle.plate}
          </p>
          <p className="text-black">
            <strong>Modelo:</strong> {vehicle.brand} {vehicle.model}
          </p>
          <p className="text-black">
            <strong>Ano:</strong> {vehicle.year}
          </p>
        </div>

        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold text-black mb-2">
            Cliente Vinculado
          </h2>
          {vehicle.client ? (
            <>
              <p className="text-black">
                <strong>Nome:</strong> {vehicle.client.name}
              </p>
              {vehicle.client.phone && (
                <p className="text-black">
                  <strong>Telefone:</strong> {vehicle.client.phone}
                </p>
              )}
            </>
          ) : (
            <p className="text-black">Nenhum cliente vinculado.</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() =>
              router.push(`/dashboard/budgets/new?vehicleId=${vehicle.id}`)
            }
            className="bg-yellow-300 text-black px-4 py-2 rounded-md cursor-pointer hover:bg-yellow-400 font-medium"
          >
            Fazer orçamento
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-green-700 font-medium"
          >
            Registrar serviço
          </button>
        </div>

        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold text-black mb-4">
            Serviços Executados
          </h2>

          {services.length === 0 && (
            <p className="text-black">Nenhum serviço executado.</p>
          )}

          <div className="space-y-4">
            {services.map((s) => {
              if (!s.budgets) return null;

              return (
                <div
                  key={s.id}
                  className="text-black border-b pb-4 flex justify-between items-start"
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-blue-700">
                      Ordem de Serviço #{s.id.slice(0, 8)}
                    </p>
                    <p className="text-sm">
                      Data: {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <ul className="list-disc ml-4 text-sm">
                      {s.budgets.budget_items.map((item) => (
                        <li key={item.id}>{item.description}</li>
                      ))}
                    </ul>
                    <p className="font-semibold text-sm">
                      {formatMoney(s.total)}
                    </p>
                  </div>

                  {/* BOTÃO EDITAR OS ADICIONADO AQUI */}
                  <button
                    onClick={() =>
                      router.push(`/dashboard/service-orders/${s.id}`)
                    }
                    className="text-sm bg-gray-100 border border-gray-300 px-3 py-1 cursor-pointer rounded hover:bg-gray-200 text-black font-medium"
                  >
                    Editar OS
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md w-full max-w-lg">
            <h3 className="text-lg font-semibold text-black mb-4">
              Selecionar orçamento
            </h3>

            <ul className="space-y-3 max-h-80 overflow-auto">
              {budgets.map((b) => {
                const used = usedBudgetIds.includes(b.id);

                return (
                  <li
                    key={b.id}
                    className="border p-3 rounded-md flex justify-between items-center text-black bg-white"
                  >
                    <div className="text-black text-sm space-y-1 max-w-xs">
                      <p
                        className={`font-semibold ${used ? "text-gray-400" : "text-black"}`}
                      >
                        {used
                          ? "Serviço já registrado"
                          : "Orçamento disponível"}
                      </p>
                      <p className="text-gray-500">
                        Data:{" "}
                        {new Date(b.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs italic text-gray-400">
                        {b.budget_items
                          .slice(0, 2)
                          .map((i) => i.description)
                          .join(", ")}
                        {b.budget_items.length > 2 && "..."}
                      </p>
                      <p className="font-semibold">{formatMoney(b.total)}</p>
                    </div>

                    <button
                      disabled={used}
                      onClick={() => handleRegisterService(b.id)}
                      className={`px-3 py-1 rounded-md text-white font-medium ${
                        used
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 cursor-pointer"
                      }`}
                    >
                      {used ? "Já Utilizado" : "Registrar"}
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 text-black underline cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
