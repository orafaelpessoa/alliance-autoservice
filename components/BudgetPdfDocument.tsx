import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

type BudgetPdfProps = {
  budget: any
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
  },
  title: {
    fontSize: 16,
    marginBottom: 10,
  },
  section: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #000",
    paddingBottom: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 2,
  },
  colDesc: { width: "40%" },
  col: { width: "15%", textAlign: "right" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  summaryTotal: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1 solid #000",
    fontSize: 12,
  },
})

/**
 * Exportamos uma FUNÇÃO que retorna o Document
 */
export function createBudgetPdfDocument({ budget }: BudgetPdfProps) {
  const client = Array.isArray(budget.client)
    ? budget.client[0]
    : budget.client

  const vehicle = Array.isArray(budget.vehicle)
    ? budget.vehicle[0]
    : budget.vehicle

  const items = budget.budget_items ?? []

  const totalParts = items
    .filter((item: any) => item.type === "part")
    .reduce((sum: number, item: any) => sum + item.total, 0)

  const totalLabor = items
    .filter((item: any) => item.type === "service")
    .reduce((sum: number, item: any) => sum + item.total, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          Orçamento #{budget.id.slice(0, 8)}
        </Text>

        <View style={styles.section}>
          <Text>Cliente: {client?.name}</Text>
          <Text>
            Veículo: {vehicle?.plate} — {vehicle?.model}
          </Text>
          <Text>
            Data: {new Date(budget.created_at).toLocaleDateString("pt-BR")}
          </Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Descrição</Text>
          <Text style={styles.col}>Qtd</Text>
          <Text style={styles.col}>Preço</Text>
          <Text style={styles.col}>Desc.</Text>
          <Text style={styles.col}>Total</Text>
        </View>

        {items.map((item: any) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.col}>{item.quantity}</Text>
            <Text style={styles.col}>
              {item.unit_price.toFixed(2)}
            </Text>
            <Text style={styles.col}>
              {item.discount.toFixed(2)}
            </Text>
            <Text style={styles.col}>
              {item.total.toFixed(2)}
            </Text>
          </View>
        ))}

        {/* RESUMO */}
        <View style={{ marginTop: 20 }}>
          <View style={styles.summaryRow}>
            <Text>Total de Peças</Text>
            <Text>R$ {totalParts.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text>Total de Mão de Obra</Text>
            <Text>R$ {totalLabor.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text>Subtotal</Text>
            <Text>R$ {budget.subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text>Descontos</Text>
            <Text>R$ {budget.discount_total.toFixed(2)}</Text>
          </View>

          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text>Total</Text>
            <Text>R$ {budget.total.toFixed(2)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}