"use client";

import { useState } from "react";
import StockCreatePartModal from "./StockCreatePartModal";
import StockMovementModal from "./StockMovementModal";

type Props = {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
};

export default function NewPartModal({ open, onClose, onFinish }: Props) {
  const [step, setStep] = useState<"create" | "initialStock">("create");
  const [partId, setPartId] = useState<string | null>(null);

  function handleClose() {
    setStep("create");
    setPartId(null);
    onClose();
  }

  return (
    <>
      {step === "create" && (
        <StockCreatePartModal
          open={open}
          onClose={handleClose}
          onSuccess={(id) => {
            setPartId(id);
            setStep("initialStock");
          }}
        />
      )}

      {step === "initialStock" && partId && (
        <StockMovementModal
          open={true}
          partId={partId}
          type="in"
          onClose={handleClose}
          onSuccess={() => {
            onFinish();
            handleClose();
          }}
        />
      )}
    </>
  );
}
