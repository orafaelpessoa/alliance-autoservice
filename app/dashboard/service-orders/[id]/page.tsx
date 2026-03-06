"use client";

import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createServiceOrderPdfBlob } from "@/lib/pdf/createServiceOrderPdf";
import Link from "next/link";

type ServiceOrderItem = {
  id?: string;
  part_id?: string;
  type: "part" | "service";
  description: string;
  quantity: number;
  unit_price: number;
  total?: number;
};

export default function ServiceOrderPage() {
  const { id: serviceId } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceOrder, setServiceOrder] = useState<any>(null);
  const [items, setItems] = useState<ServiceOrderItem[]>([]);
  const [initialItems, setInitialItems] = useState<ServiceOrderItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Busca usuário logado
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Erro ao pegar usuário logado", error);
        return;
      }
      if (data.user) setUser({ id: data.user.id });
    };
    getUser();
  }, []);

  // Carrega OS
  useEffect(() => {
    if (!serviceId) return;

    const loadServiceOrder = async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select(
          `
          id,
          total_parts,
          total_services,
          discount,
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
          service_order_items (
            id,
            part_id,
            type,
            description,
            quantity,
            unit_price,
            total
          )
        `
        )
        .eq("id", serviceId)
        .single();

      if (error || !data) {
        router.push("/dashboard");
        return;
      }

      setServiceOrder(data);
      setItems(data.service_order_items ?? []);
      setLoading(false);
    };

    loadServiceOrder();
  }, [serviceId, router]);

  // PDF
  async function handleDownloadPdf() {
    if (!serviceOrder) return;
    setDownloading(true);
    try {
      const blob = await createServiceOrderPdfBlob(serviceOrder);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `os-${serviceOrder.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  // Salvar alterações
  async function handleSave() {
    if (!serviceOrder || !user) return;
    setSaving(true);

    try {
      const jsonItems = items.map((i) => ({
        part_id: i.part_id || null,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        type: i.type,
      }));

      const { error } = await supabase.rpc("update_service_order", {
        p_service_order_id: serviceOrder.id,
        p_items: jsonItems,
        p_created_by: user.id,
      });

      if (error) throw error;

      // Recarrega OS após salvar
      const { data } = await supabase
        .from("service_orders")
        .select(
          `
          id,
          total_parts,
          total_services,
          discount,
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
          service_order_items (
            id,
            part_id,
            type,
            description,
            quantity,
            unit_price,
            total
          )
        `
        )
        .eq("id", serviceOrder.id)
        .single();

      setServiceOrder(data);
      setItems(data?.service_order_items ?? []);
      setEditing(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar OS");
    } finally {
      setSaving(false);
    }
  }

  // Cancelar OS
  async function handleCancel() {
    if (!serviceOrder || !user) return;
    const confirmCancel = confirm(
      "Deseja realmente cancelar esta ordem de serviço?"
    );
    if (!confirmCancel) return;

    try {
      const { error } = await supabase.rpc("cancel_service_order", {
        p_service_order_id: serviceOrder.id,
      });
      if (error) throw error;
      router.push(`/dashboard/vehicles/${serviceOrder.vehicle.id}`);
    } catch (err) {
      console.error(err);
      alert("Erro ao cancelar OS");
    }
  }

  if (
    loading ||
    !serviceOrder ||
    !serviceOrder.client ||
    !serviceOrder.vehicle
  ) {
    return (
      <main className="min-h-screen bg-gray-100">
        <AppHeader />
        <p className="text-center mt-20 text-black">
          Carregando dados da ordem de serviço…
        </p>
      </main>
    );
  }

  const client = serviceOrder.client;
  const vehicle = serviceOrder.vehicle;

  const totalParts = items
    .filter((i) => i.type === "part")
    .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const totalLabor = items
    .filter((i) => i.type === "service")
    .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const subtotal = totalParts + totalLabor;
  const totalDiscount = Number(serviceOrder.discount);
  const totalFinal = Number(serviceOrder.total);

  // Detecção de alterações
  function startEditing() {
    setInitialItems(items.map((i) => ({ ...i })));
    setEditing(true);
  }

  function hasChanges(): boolean {
    if (items.length !== initialItems.length) return true;
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      const b = initialItems[i];
      if (
        a.part_id !== b.part_id ||
        a.type !== b.type ||
        a.description !== b.description ||
        a.quantity !== b.quantity ||
        a.unit_price !== b.unit_price
      )
        return true;
    }
    return false;
  }

  function updateItem(index: number, key: keyof ServiceOrderItem, value: any) {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addService() {
    setItems((prev) => [
      ...prev,
      { type: "service", description: "", quantity: 1, unit_price: 0 },
    ]);
  }

  function addPart() {
    setItems((prev) => [
      ...prev,
      { type: "part", part_id: "", description: "", quantity: 1, unit_price: 0 },
    ]);
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <AppHeader />

      <style jsx global>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      <section className="max-w-4xl mx-auto px-4 mt-10 space-y-8">
        <header className="flex flex-wrap gap-4 justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-black">
              Ordem de Serviço #{serviceOrder.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-black">
              Criada em{" "}
              {new Date(serviceOrder.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {!editing && (
              <button
                onClick={startEditing}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                Editar OS
              </button>
            )}

            {editing && (
              <button
                onClick={handleSave}
                disabled={!hasChanges() || saving}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 cursor-pointer disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-4 py-2 rounded-md bg-black text-white cursor-pointer hover:bg-gray-800 disabled:opacity-50"
            >
              {downloading ? "Gerando PDF..." : "Baixar PDF"}
            </button>

            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 cursor-pointer"
            >
              Cancelar OS
            </button>

            <Link
              href={`/dashboard/vehicles/${vehicle.id}`}
              className="px-4 py-2 rounded-md bg-gray-200 text-black hover:bg-gray-300 cursor-pointer"
            >
              Voltar para veículo
            </Link>
          </div>
        </header>

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

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-black mb-4">
            Itens da Ordem de Serviço
          </h2>

          {editing && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={addPart}
                className="px-3 py-1 rounded bg-gray-200 text-black hover:bg-gray-300 cursor-pointer"
              >
                + Peça
              </button>
              <button
                onClick={addService}
                className="px-3 py-1 rounded bg-gray-200 text-black hover:bg-gray-300 cursor-pointer"
              >
                + Serviço
              </button>
            </div>
          )}

          <table className="w-full text-sm text-black">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Descrição</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th className="text-right">Total</th>
                {editing && <th className="text-center">Ações</th>}
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td>
                    {editing ? (
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        className="w-full border px-2 py-1"
                      />
                    ) : (
                      item.description
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        type="number"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", Number(e.target.value))
                        }
                        className="w-16 border px-2 py-1"
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        type="number"
                        value={item.unit_price === 0 ? "" : item.unit_price}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "unit_price",
                            Number(e.target.value),
                          )
                        }
                        className="w-20 border px-2 py-1"
                      />
                    ) : (
                      `R$ ${item.unit_price.toFixed(2)}`
                    )}
                  </td>
                  <td className="text-right font-medium">
                    R$ {(item.quantity * item.unit_price).toFixed(2)}
                  </td>
                  {editing && (
                    <td className="text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
                      >
                        Remover
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
            <span>Desconto</span>
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