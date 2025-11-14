import { createContext, useContext, useState, ReactNode } from "react";

interface ProofMetrics {
  totalCustomers: number;
  messagesSent: number;
  conversionRate: string;
}

interface DailyData {
  date: string;
  revenue: number;
}

interface ProofMetricsContextType {
  proofMetrics: ProofMetrics;
  dailyData: DailyData[];
  setProofData: (metrics: ProofMetrics, dailyData: DailyData[]) => void;
  clearProofData: () => void;
}

const ProofMetricsContext = createContext<ProofMetricsContextType | undefined>(undefined);

export const ProofMetricsProvider = ({ children }: { children: ReactNode }) => {
  const [proofMetrics, setProofMetrics] = useState<ProofMetrics>({
    totalCustomers: 0,
    messagesSent: 0,
    conversionRate: "8.5%",
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  const setProofData = (metrics: ProofMetrics, daily: DailyData[]) => {
    setProofMetrics(metrics);
    setDailyData(daily);
  };

  const clearProofData = () => {
    setProofMetrics({
      totalCustomers: 0,
      messagesSent: 0,
      conversionRate: "8.5%",
    });
    setDailyData([]);
  };

  return (
    <ProofMetricsContext.Provider value={{ proofMetrics, dailyData, setProofData, clearProofData }}>
      {children}
    </ProofMetricsContext.Provider>
  );
};

export const useProofMetrics = () => {
  const context = useContext(ProofMetricsContext);
  if (context === undefined) {
    throw new Error("useProofMetrics must be used within ProofMetricsProvider");
  }
  return context;
};