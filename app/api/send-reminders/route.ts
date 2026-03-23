import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    // 1. Buscar lembretes pendentes
    const { data, error } = await supabaseAdmin.rpc("get_pending_reminders");

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ message: "Nenhum lembrete pendente" });
    }

    // 2. Enviar emails
    for (const reminder of data) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const dataServico = new Date(reminder.service_date);
      dataServico.setHours(0, 0, 0, 0);

      const diasPassados = Math.floor(
        (hoje.getTime() - dataServico.getTime()) / (1000 * 60 * 60 * 24),
      );
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: reminder.user_email,
        subject: "Lembrete de revisão",
        html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #000;">
    
    <p style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">
      SISTEMA INTERNO ALLIANCE
    </p>

    <h2 style="margin-bottom: 15px;">
      Aviso de Revisão Preventiva Recomendada
    </h2>

    <p style="margin-bottom: 20px;">
      Já se passaram <strong>${diasPassados} dias</strong> desde a última troca de óleo.
    </p>

    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
      <p><strong>Cliente:</strong> ${reminder.client_name}</p>
      <p><strong>Telefone:</strong> ${reminder.client_phone ?? "Não informado"}</p>
      <p><strong>Veículo:</strong> ${reminder.plate} - ${reminder.model}</p>
      <p><strong>Data da última troca de óleo:</strong> ${new Date(reminder.service_date).toLocaleDateString("pt-BR")}</p>
    </div>

  </div>
`,
      });

      // 3. Marcar como notificado
      await supabaseAdmin
        .from("service_reminders")
        .update({
          notified: true,
          notified_at: new Date().toISOString(),
        })
        .eq("id", reminder.id);
    }

    return NextResponse.json({ success: true, total: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
