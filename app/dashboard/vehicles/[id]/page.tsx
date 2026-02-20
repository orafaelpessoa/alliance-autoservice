"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";

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

type Service = {
  id: string;
  description: string;
  created_at: string;
};

export default function VehiclePage() {
  const params = useParams();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) return;
    loadVehicle();
    loadServices();
  }, [vehicleId]);

  /* =========================
     CARREGAR VEÍCULO + CLIENTE
     ========================= */
  async function loadVehicle() {
    setLoading(true);

    const { data, error } = await supabase
      .from("vehicles")
      .select(
        `
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
      `
      )
      .eq("id", vehicleId)
      .single();

    if (error || !data) {
      console.error("Erro ao carregar veículo:", error);
      setVehicle(null);
      setLoading(false);
      return;
    }

    setVehicle({
      id: data.id,
      plate: data.plate,
      brand: data.brand,
      model: data.model,
      year: data.year,
      // 🔑 relação vem como array ou objeto → normalizamos
      client: Array.isArray(data.client)
        ? data.client[0] ?? null
        : data.client ?? null,
    });

    setLoading(false);
  }

  /* =========================
     CARREGAR SERVIÇOS
     ========================= */
  async function loadServices() {
    const { data, error } = await supabase
      .from("vehicle_services")
      .select("id, description, created_at")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar serviços:", error);
      return;
    }

    if (data) setServices(data);
  }

  /* =========================
     ADICIONAR SERVIÇO
     ========================= */
  async function addService() {
    if (!newService.trim()) return;

    // 🔎 TESTE DE SESSÃO (IMPORTANTE)
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    console.log("SESSION:", sessionData?.session);
    console.log("SESSION ERROR:", sessionError);

    if (!sessionData?.session) {
      alert("Usuário não autenticado");
      return;
    }

    const { error } = await supabase.from("vehicle_services").insert({
      vehicle_id: vehicleId,
      description: newService,
      created_by: sessionData.session.user.id,
    });

    if (error) {
      console.error("Erro ao adicionar serviço:", error);
      alert("Erro ao salvar serviço");
      return;
    }

    setNewService("");
    loadServices();
  }

  /* =========================
     ESTADOS DE TELA
     ========================= */
  if (loading) {
    return (
      <div className="p-8 text-center text-black">
        Carregando veículo...
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8 text-center text-black">
        Veículo não encontrado.
      </div>
    );
  }

  /* =========================
     RENDER
     ========================= */
  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-yellow-400 px-6 py-4 shadow">
        <h1 className="text-xl font-bold text-center text-black">
          Veículo {vehicle.plate}
        </h1>
      </header>

      <section className="max-w-4xl mx-auto mt-8 space-y-6 px-4">
        {/* VEÍCULO */}
        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold mb-4 text-black">
            Informações do Veículo
          </h2>

          <div className="grid md:grid-cols-2 gap-4 text-black">
            <p><strong>Marca:</strong> {vehicle.brand}</p>
            <p><strong>Modelo:</strong> {vehicle.model}</p>
            <p><strong>Ano:</strong> {vehicle.year}</p>
          </div>
        </div>

        {/* CLIENTE */}
        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold mb-4 text-black">
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
            <p className="text-sm text-black">
              Nenhum cliente vinculado a este veículo.
            </p>
          )}
        </div>

        {/* SERVIÇOS */}
        <div className="bg-white p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold mb-4 text-black">
            Histórico de Serviços
          </h2>

          <textarea
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            className="w-full border px-3 py-2 rounded-md text-black mb-4"
            placeholder="Descreva o serviço realizado..."
          />

          <button
            onClick={addService}
            className="bg-yellow-400 text-black px-4 py-2 rounded-md shadow hover:bg-yellow-300"
          >
            Adicionar Serviço
          </button>

          <div className="mt-6 space-y-4">
            {services.length === 0 && (
              <p className="text-sm text-black">
                Nenhum serviço registrado ainda.
              </p>
            )}

            {services.map((service) => (
              <div
                key={service.id}
                className="border p-3 rounded-md bg-gray-50"
              >
                <p className="text-sm text-gray-600">
                  {new Date(service.created_at).toLocaleDateString()}
                </p>
                <p>{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}