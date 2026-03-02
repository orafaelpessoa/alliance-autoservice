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

type Budget = {
  id: string;
  created_at: string;
  total: number;
};

type Service = {
  id: string;
  created_at: string;
  budget_id: string;
};

export default function VehiclePage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!vehicleId) return;
    loadAll();
  }, [vehicleId]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([
      loadVehicle(),
      loadBudgets(),
      loadServices(),
    ]);
    setLoading(false);
  }

  async function loadVehicle() {
    const { data } = await supabase
      .from("vehicles")
      .select(`
        id,
        plate,
        brand,
        model,
        year,
        client:clients (
          id,
          name,
          phone
        )
      `)
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
        ? data.client[0] ?? null
        : data.client ?? null,
    });
  }

  async function loadBudgets() {
    const { data } = await supabase
      .from("budgets")
      .select("id, created_at, total")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });

    if (data) setBudgets(data);
  }

  async function loadServices() {
    const { data } = await supabase
      .from("services")
      .select("id, created_at, budget_id")
      .eq("vehicle_id", vehicleId);

    if (data) setServices(data);
  }

  function formatMoney(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  async function registerService(budgetId: string) {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) return;

    const { data, error } = await supabase
      .from("services")
      .insert({
        vehicle_id: vehicleId,
        budget_id: budgetId,
        created_by: session.session.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      alert("Erro ao registrar serviço");
      return;
    }

    setShowModal(false);
    router.push(`/dashboard/services/${data.id}`);
  }

  const usedBudgetIds = services.map((s) => s.budget_id);

  if (loading || !vehicle) {
    return <div className="p-8 text-center text-black">Carregando...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />

      <section className="max-w-5xl mx-auto mt-8 space-y-6 px-4">
        {/* VEÍCULO */}
        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold text-black mb-2">
            Informações do Veículo
          </h2>
          <p className="text-black"><strong>Placa:</strong> {vehicle.plate}</p>
          <p className="text-black">
            <strong>Modelo:</strong> {vehicle.brand} {vehicle.model}
          </p>
          <p className="text-black"><strong>Ano:</strong> {vehicle.year}</p>
        </div>

        {/* CLIENTE */}
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

        {/* AÇÕES */}
        <div className="flex gap-3">
          <button
            onClick={() =>
              router.push(`/dashboard/budgets/new?vehicleId=${vehicle.id}`)
            }
            className="bg-yellow-300 text-black px-4 py-2 cursor-pointer rounded-md hover:bg-yellow-400"
          >
            Fazer orçamento
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="bg-green-600 text-white px-4 py-2 cursor-pointer rounded-md hover:bg-green-700"
          >
            Registrar serviço
          </button>
        </div>

        {/* SERVIÇOS */}
        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold text-black mb-4">
            Serviços Executados
          </h2>

          {services.length === 0 && (
            <p className="text-black">Nenhum serviço executado.</p>
          )}

          <ul className="space-y-2">
            {services.map((s) => (
              <li
                key={s.id}
                className="border p-3 rounded-md flex justify-between text-black"
              >
                <span>
                  {new Date(s.created_at).toLocaleDateString("pt-BR")} — Orçamento{" "}
                  {s.budget_id.slice(0, 8)}
                </span>

                <button
                  onClick={() => router.push(`/dashboard/services/${s.id}`)}
                  className="bg-black text-white px-3 py-1 rounded-md"
                >
                  Ver serviço
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md w-full max-w-lg">
            <h3 className="text-lg font-semibold text-black mb-4">
              Selecionar orçamento
            </h3>

            <ul className="space-y-2 max-h-80 overflow-auto">
              {budgets.map((b) => {
                const used = usedBudgetIds.includes(b.id);

                return (
                  <li
                    key={b.id}
                    className="border p-3 rounded-md flex justify-between items-center text-black"
                  >
                    <span>
                      {new Date(b.created_at).toLocaleDateString("pt-BR")} —{" "}
                      {formatMoney(b.total)}
                    </span>

                    <button
                      disabled={used}
                      onClick={() => registerService(b.id)}
                      className={`px-3 py-1 rounded-md cursor-pointer text-white ${
                        used
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {used ? "Já utilizado" : "Registrar"}
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 text-black cursor-pointer underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}