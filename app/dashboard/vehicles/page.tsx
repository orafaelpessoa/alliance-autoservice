"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Car, Plus } from "lucide-react";
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
  year: number;
  client: Client | null;
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    async function fetchVehicles() {
      const { data, error } = await supabase
        .from("vehicles")
        .select(
          `
          id,
          plate,
          brand,
          model,
          year,
          created_at,
          client:clients (
            id,
            name,
            phone
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar veículos:", error);
        setLoading(false);
        return;
      }

      const normalized: Vehicle[] = (data ?? []).map((v: any) => ({
        ...v,
        client: Array.isArray(v.client) ? (v.client[0] ?? null) : v.client,
      }));

      setVehicles(normalized);
      setLoading(false);
    }

    fetchVehicles();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader>
        <button
          onClick={() => router.push("/dashboard/vehicles/new")}
          className="bg-black text-white px-4 py-2 rounded-md shadow hover:bg-gray-800 flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          Cadastrar
        </button>
      </AppHeader>

      <h2 className="text-lg font-semibold text-black max-w-3xl mx-auto mt-6 px-4">
        Veículos cadastrados
      </h2>

      {/* LISTA */}
      <section className="max-w-3xl mx-auto mt-8 px-4 flex flex-col gap-4">
        {loading && (
          <p className="text-sm text-black">Carregando veículos...</p>
        )}

        {!loading && vehicles.length === 0 && (
          <p className="text-sm text-black">Nenhum veículo cadastrado.</p>
        )}

        {vehicles.map((vehicle) => (
          <button
            key={vehicle.id}
            onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}
            className="bg-white rounded-md shadow-md hover:shadow-lg transition px-4 py-4 text-left flex gap-4 cursor-pointer"
          >
            <div className="text-yellow-500 mt-1">
              <Car size={20} />
            </div>

            <div className="flex flex-col">
              <span className="font-semibold text-black uppercase">
                {vehicle.plate}
              </span>

              <span className="text-sm text-black">
                {vehicle.brand} {vehicle.model} • {vehicle.year}
              </span>

              <span className="text-xs text-black">
                Cliente: {vehicle.client?.name ?? "—"}
              </span>
            </div>
          </button>
        ))}
      </section>
    </main>
  );
}
