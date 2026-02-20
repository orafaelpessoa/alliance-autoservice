"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  phone: string;
};

export default function NewVehiclePage() {
  const router = useRouter();

  // veículo
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  // cliente
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>("");

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, phone")
      .order("name");

    if (!error && data) {
      setClients(data);
    }
  }

  async function handleSubmit() {
    if (!plate || !brand || !model || !year) {
      alert("Preencha todos os dados do veículo");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado");
      setLoading(false);
      return;
    }

    let finalClientId = clientId || null;

    // ===============================
    // CRIA CLIENTE (SE NOVO)
    // ===============================
    if (mode === "new") {
      if (!clientName.trim() || !clientPhone.trim()) {
        alert("Informe nome e telefone do cliente");
        setLoading(false);
        return;
      }

      const { data: newClient, error } = await supabase
        .from("clients")
        .insert({
          name: clientName.trim(),
          phone: clientPhone.trim(),
          // ❌ NÃO EXISTE created_by EM clients
        })
        .select("id")
        .single();

      if (error || !newClient) {
        console.error(error);
        alert("Erro ao criar cliente");
        setLoading(false);
        return;
      }

      finalClientId = newClient.id;
    }

    if (!finalClientId) {
      alert("Selecione ou cadastre um cliente");
      setLoading(false);
      return;
    }

    // ===============================
    // CRIA VEÍCULO
    // ===============================
    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .insert({
        plate: plate.trim().toUpperCase(),
        brand: brand.trim(),
        model: model.trim(),
        year: year.trim(),
        client_id: finalClientId,
        created_by: user.id, // ✅ EXISTE E É OBRIGATÓRIO
      })
      .select("id")
      .single();

    if (error || !vehicle) {
      console.error(error);
      alert("Erro ao cadastrar veículo");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/dashboard/vehicles/${vehicle.id}`);
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-yellow-400 px-6 py-4 shadow">
        <h1 className="text-xl font-bold text-center text-black">
          Cadastro de Veículo
        </h1>
      </header>

      <section className="max-w-3xl mx-auto mt-8 bg-white p-6 rounded-md shadow">
        {/* VEÍCULO */}
        <h2 className="text-lg font-semibold mb-4 text-black">
          Dados do Veículo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="Placa"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            className="border px-3 py-2 rounded-md text-black"
          />

          <input
            placeholder="Marca"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="border px-3 py-2 rounded-md text-black"
          />

          <input
            placeholder="Modelo"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border px-3 py-2 rounded-md text-black"
          />

          <input
            placeholder="Ano"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border px-3 py-2 rounded-md text-black"
          />
        </div>

        {/* CLIENTE */}
        <h2 className="text-lg font-semibold mt-8 mb-4 text-black">
          Cliente
        </h2>

        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 text-black">
            <input
              type="radio"
              checked={mode === "existing"}
              onChange={() => setMode("existing")}
            />
            Cliente existente
          </label>

          <label className="flex items-center gap-2 text-black">
            <input
              type="radio"
              checked={mode === "new"}
              onChange={() => setMode("new")}
            />
            Novo cliente
          </label>
        </div>

        {mode === "existing" && (
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="border px-3 py-2 rounded-md w-full text-black"
          >
            <option value="">Selecione um cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
        )}

        {mode === "new" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Nome do cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="border px-3 py-2 rounded-md text-black"
            />

            <input
              placeholder="Telefone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="border px-3 py-2 rounded-md text-black"
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-8 w-full bg-yellow-400 text-black px-4 py-2 rounded-md shadow hover:bg-yellow-300 disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Cadastrar veículo"}
        </button>
      </section>
    </main>
  );
}