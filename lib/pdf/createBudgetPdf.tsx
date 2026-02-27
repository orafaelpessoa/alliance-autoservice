import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer"
import React from "react"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderBottom: "1 solid #000",
    paddingBottom: 10,
  },
  headerLogo: {
    width: 85,
    height: 50,
    marginRight: 12,
  },
  headerText: {
    flexGrow: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  companyInfo: {
    fontSize: 9,
    marginTop: 2,
  },

  /* WATERMARK */
  watermark: {
  position: "absolute",
  top: "20%",
  left: "5%",
  width: 500,
  opacity: 0.1,
},

  title: {
    fontSize: 14,
    marginBottom: 12,
    marginTop: 10,
    fontWeight: "bold",
  },

  section: {
    marginBottom: 12,
  },

  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #000",
    paddingBottom: 4,
    marginBottom: 4,
    marginTop: 10,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    marginBottom: 2,
  },

  colDesc: {
    width: "40%",
  },

  col: {
    width: "15%",
    textAlign: "right",
  },

  summary: {
    marginTop: 20,
    paddingTop: 10,
    borderTop: "1 solid #000",
    alignItems: "flex-end",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "40%",
    marginBottom: 2,
  },

  total: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
})

function BudgetPdfDocument({ budget }: { budget: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* WATERMARK */}
        <Image
          src="/assets/LOGO_ALLIANCE.png"
          style={styles.watermark}
        />

        {/* HEADER */}
        <View style={styles.header}>
          <Image
            src="/assets/LOGO_ALLIANCE.png"
            style={styles.headerLogo}
          />

          <View style={styles.headerText}>
            <Text style={styles.companyName}>
              Alliance Auto Service Oficina Mecânica
            </Text>
            <Text style={styles.companyInfo}>
              Rua Josias Barbosa Ferreira, 35
            </Text>
            <Text style={styles.companyInfo}>
              Telefone / WhatsApp: (83) 98818-2412
            </Text>
          </View>
        </View>

        {/* TITLE */}
        <Text style={styles.title}>
          Orçamento #{budget.id.slice(0, 8)}
        </Text>

        {/* CLIENT / VEHICLE */}
        <View style={styles.section}>
          <Text>Cliente: {budget.client.name}</Text>
          <Text>
            Veículo: {budget.vehicle.plate} — {budget.vehicle.model}
          </Text>
          <Text>
            Data:{" "}
            {new Date(budget.created_at).toLocaleDateString("pt-BR")}
          </Text>
        </View>

        {/* TABLE */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Descrição</Text>
          <Text style={styles.col}>Qtd</Text>
          <Text style={styles.col}>Preço</Text>
          <Text style={styles.col}>Desc.</Text>
          <Text style={styles.col}>Total</Text>
        </View>

        {(budget.budget_items ?? []).map((item: any) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.col}>{item.quantity}</Text>
            <Text style={styles.col}>
              R$ {item.unit_price.toFixed(2)}
            </Text>
            <Text style={styles.col}>
              R$ {item.discount.toFixed(2)}
            </Text>
            <Text style={styles.col}>
              R$ {item.total.toFixed(2)}
            </Text>
          </View>
        ))}

        {/* SUMMARY */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text>Subtotal</Text>
            <Text>R$ {budget.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Descontos</Text>
            <Text>R$ {budget.discount_total.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.total}>Total</Text>
            <Text style={styles.total}>
              R$ {budget.total.toFixed(2)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

/**
 * 👉 Função usada pelo client (NÃO muda)
 */
export async function createBudgetPdfBlob(
  budget: any
): Promise<Blob> {
  const doc = <BudgetPdfDocument budget={budget} />
  return await pdf(doc).toBlob()
}