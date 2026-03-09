"use client";

import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createServiceOrderPdfBlob } from "@/lib/pdf/createServiceOrderPdf";
import Link from "next/link";
import PartPickerModal from "@/components/PartPickerModal";

type ServiceOrderItem = {
  id?: string;
  part_id?: string;
  type: "part" | "service";
  description: string;
  quantity: number;
  unit_price: number;
  total?: number;
};

type StockPart = {
  id: string;
  name: string;
  sale_price: number;
  quantity: number;
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

  const [stockParts, setStockParts] = useState<StockPart[]>([]);
  const [showPartModal, setShowPartModal] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) return;
      if (data.user) setUser({ id: data.user.id });
    };
    getUser();
    loadStock();
  }, []);

  const loadStock = async () => {
    const { data } = await supabase
      .from("stock_current")
      .select("id, name, sale_price, quantity")
      .order("name");
    setStockParts(data || []);
  };

  const loadServiceOrder = async () => {
    if (!serviceId) return;

    const { data, error } = await supabase
      .from("service_orders")
      .select(
        `
        id, status, total_parts, total_services, discount, total, created_at,
        client:clients (id, name),
        vehicle:vehicles (id, plate, model),
        service_order_items (id, part_id, type, description, quantity, unit_price, total)
      `,
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

  useEffect(() => {
    loadServiceOrder();
  }, [serviceId]);

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

  async function handleSave() {
  if (!serviceOrder || !user) return;
  setSaving(true);

  try {
    // 1. Primeiro atualizamos o desconto na tabela service_orders
    const { error: discountError } = await supabase
      .from("service_orders")
      .update({ discount: Number(serviceOrder.discount || 0) })
      .eq("id", serviceOrder.id);

    if (discountError) throw discountError;

    // 2. Agora processamos os itens e o estoque via RPC
    const jsonItems = items.map((i) => ({
      id: i.id || null,
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

    await loadServiceOrder();
    await loadStock();
    setEditing(false);
  } catch (err: any) {
    alert(err.message || "Erro ao salvar OS");
  } finally {
    setSaving(false);
  }
}

  async function handleCancel() {
    if (!serviceOrder || !user) return;
    if (!confirm("Deseja realmente cancelar esta ordem de serviço?")) return;

    try {
      const { error } = await supabase.rpc("cancel_service_order", {
        p_service_order_id: serviceOrder.id,
        p_created_by: user.id,
      });

      if (error) throw error;
      router.push(`/dashboard/vehicles/${serviceOrder.vehicle.id}`);
    } catch (err: any) {
      alert(err.message || "Erro ao cancelar OS");
    }
  }

  async function startEditing() {
    if (!serviceOrder) return;
    const { error } = await supabase
      .from("service_orders")
      .update({ status: "open" })
      .eq("id", serviceOrder.id);

    if (error) {
      alert("Erro ao iniciar edição");
      return;
    }

    setInitialItems(items.map((i) => ({ ...i })));
    setEditing(true);
    setServiceOrder({ ...serviceOrder, status: "open" });
  }

  const addPartFromModal = (part: StockPart) => {
    if (part.quantity <= 0) {
      alert("Peça indisponível em estoque");
      return;
    }

    const existing = items.find((i) => i.part_id === part.id);
    if (existing && existing.quantity >= part.quantity) {
      alert("Quantidade máxima disponível em estoque atingida");
      return;
    }

    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.part_id === part.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          type: "part",
          part_id: part.id,
          description: part.name,
          quantity: 1,
          unit_price: part.sale_price,
        },
      ]);
    }
    setShowPartModal(false);
  };

  const updateItem = (
    index: number,
    key: keyof ServiceOrderItem,
    value: any,
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      let val = value;

      if (
        key === "quantity" &&
        copy[index].type === "part" &&
        copy[index].part_id
      ) {
        const stock = stockParts.find((p) => p.id === copy[index].part_id);
        if (stock && value > stock.quantity) {
          alert(`Estoque insuficiente. Disponível: ${stock.quantity}`);
          val = stock.quantity;
        }
      }

      copy[index] = { ...copy[index], [key]: val };
      return copy;
    });
  };

  function hasChanges(): boolean {
    if (items.length !== initialItems.length) return true;
    return items.some((item, idx) => {
      const init = initialItems[idx];
      return (
        item.description !== init.description ||
        item.quantity !== init.quantity ||
        item.unit_price !== init.unit_price ||
        item.part_id !== init.part_id
      );
    });
  }

  if (loading || !serviceOrder?.client || !serviceOrder?.vehicle) {
    return (
      <main className="min-h-screen bg-gray-100">
        <AppHeader />
        <p className="text-center mt-20 text-black">Carregando dados...</p>
      </main>
    );
  }

  const totalParts = items
    .filter((i) => i.type === "part")
    .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const totalLabor = items
    .filter((i) => i.type === "service")
    .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const subtotal = totalParts + totalLabor;
  const totalFinal = subtotal - Number(serviceOrder.discount || 0);

  return (
    <main className="min-h-screen bg-gray-100 text-black">
      <AppHeader />
      <style jsx global>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <section className="max-w-4xl mx-auto px-4 mt-10 space-y-8 pb-10">
        <header className="flex flex-wrap gap-4 justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold">
              Ordem de Serviço #{serviceOrder.id.slice(0, 8)}
            </h1>
            <p className="text-sm">
              Criada em{" "}
              {new Date(serviceOrder.created_at).toLocaleDateString("pt-BR")}
            </p>
            <p className="text-xs font-bold uppercase mt-1 text-blue-600">
              Status: {serviceOrder.status}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {!editing && serviceOrder.status !== "canceled" && (
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
            {serviceOrder.status !== "canceled" && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-md bg-red-600 cursor-pointer text-white hover:bg-red-700"
              >
                Cancelar OS
              </button>
            )}
            <Link
              href={`/dashboard/vehicles/${serviceOrder.vehicle.id}`}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
            >
              Voltar
            </Link>
          </div>
        </header>

        <div className="bg-white rounded-lg shadow p-6 grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Cliente</p>
            <p className="font-medium">{serviceOrder.client.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Veículo</p>
            <p className="font-medium">
              {serviceOrder.vehicle.plate} — {serviceOrder.vehicle.model}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Itens da OS</h2>
            {editing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPartModal(true)}
                  className="px-3 py-1 rounded bg-gray-200 cursor-pointer hover:bg-gray-300"
                >
                  + Peça
                </button>
                <button
                  onClick={() =>
                    setItems([
                      ...items,
                      {
                        type: "service",
                        description: "",
                        quantity: 1,
                        unit_price: 0,
                      },
                    ])
                  }
                  className="px-3 py-1 rounded bg-gray-200 cursor-pointer hover:bg-gray-300"
                >
                  + Serviço
                </button>
              </div>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Descrição</th>
                <th className="w-20">Qtd</th>
                <th className="w-28">Preço</th>
                <th className="text-right">Total</th>
                {editing && <th className="text-center w-20">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2">
                    {editing ? (
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        className="w-full border px-2 py-1 rounded"
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
                        placeholder="0"
                        className="w-16 border px-2 py-1 rounded"
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
                        placeholder="0.00"
                        className="w-24 border px-2 py-1 rounded"
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
                        onClick={() =>
                          setItems(items.filter((_, i) => i !== index))
                        }
                        className="px-2 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-700 transition-colors cursor-pointer"
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

        <div className="bg-white rounded-lg shadow p-6 space-y-2">
          <div className="flex justify-between">
            <span>Total de Peças</span>
            <span>R$ {totalParts.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Mão de Obra</span>
            <span>R$ {totalLabor.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Desconto</span>
            {editing ? (
              <input
                type="number"
                value={serviceOrder.discount === 0 ? "" : serviceOrder.discount}
                onChange={(e) =>
                  setServiceOrder({
                    ...serviceOrder,
                    discount: Number(e.target.value),
                  })
                }
                placeholder="0.00"
                className="w-24 border px-2 py-1 rounded text-right"
              />
            ) : (
              <span>R$ {Number(serviceOrder.discount).toFixed(2)}</span>
            )}
          </div>
          <div className="flex justify-between font-semibold text-lg border-t pt-2 text-black">
            <span>Total Final</span>
            <span>R$ {totalFinal.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {showPartModal && (
        <PartPickerModal
          parts={stockParts}
          onSelect={addPartFromModal}
          onClose={() => setShowPartModal(false)}
        />
      )}
    </main>
  );
}
