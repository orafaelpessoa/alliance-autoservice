"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { maskPhone, maskPlate } from "@/lib/masks";

type Client = {
  id: string;
  name: string;
  phone: string;
};

export default function NewVehiclePage() {
  const router = useRouter();

  // ===============================
  // VEÍCULO
  // ===============================
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  // ===============================
  // CLIENTE
  // ===============================
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, name, phone")
      .order("name");

    if (data) setClients(data);
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
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          alert(
            "Cliente já cadastrado.\nVerifique a lista de clientes existentes.",
          );
        } else {
          console.error(error);
          alert("Erro ao criar cliente");
        }
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
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !vehicle) {
      console.error(error);
      alert("Erro ao cadastrar veículo");
      setLoading(false);
      return;
    }

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
        {/* ================= VEÍCULO ================= */}
        <h2 className="text-lg font-semibold mb-4 text-black">
          Dados do Veículo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={plate}
            onChange={(e) => setPlate(maskPlate(e.target.value))}
            placeholder="ABC-1234"
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

        {/* ================= CLIENTE ================= */}
        <h2 className="text-lg font-semibold mt-8 mb-4 text-black">Cliente</h2>

        {/* RADIO */}
        <div className="flex gap-6 mb-6">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`px-4 py-2 rounded-md border cursor-pointer text-black ${
              mode === "existing"
                ? "bg-yellow-400 border-yellow-400"
                : "bg-white"
            }`}
          >
            Cliente existente
          </button>

          <button
            type="button"
            onClick={() => setMode("new")}
            className={`px-4 py-2 rounded-md border cursor-pointer text-black ${
              mode === "new" ? "bg-yellow-400 border-yellow-400" : "bg-white"
            }`}
          >
            Novo cliente
          </button>
        </div>

        {/* SLIDE CONTAINER */}
        <div className="relative overflow-hidden">
          <div
            className={`flex transition-transform duration-300 ease-in-out ${
              mode === "existing" ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* EXISTENTE */}
            <div className="w-full shrink-0 pr-4">
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
            </div>

            {/* NOVO */}
            <div className="w-full shrink-0 pl-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Nome do cliente"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="border px-3 py-2 rounded-md text-black"
                />

                <input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(maskPhone(e.target.value))}
                  placeholder="(83) 98888-8888"
                  className="border px-3 py-2 rounded-md text-black"
                />
              </div>
            </div>
          </div>
        </div>

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