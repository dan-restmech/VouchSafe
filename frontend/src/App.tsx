import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./wagmi";
import { shortAddr, formatDistanceToNow } from "./utils";

const ADDR = (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000";
const ABI = [
  { name: "vouch", type: "function", stateMutability: "nonpayable", inputs: [{ name: "target", type: "address" }, { name: "reason", type: "string" }], outputs: [] },
  { name: "unvouch", type: "function", stateMutability: "nonpayable", inputs: [{ name: "target", type: "address" }], outputs: [] },
  { name: "getVouches", type: "function", stateMutability: "view", inputs: [{ name: "target", type: "address" }], outputs: [{ type: "tuple[]", components: [{ name: "from", type: "address" }, { name: "reason", type: "string" }, { name: "timestamp", type: "uint256" }] }] },
  { name: "trustScore", type: "function", stateMutability: "view", inputs: [{ name: "target", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "hasVouchedFor", type: "function", stateMutability: "view", inputs: [{ name: "from", type: "address" }, { name: "target", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "totalVouches", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const AC = "#0ea5e9";

export default function App() {
  const { isConnected, address } = useAccount();
  const [lookupAddr, setLookupAddr] = useState(""); const [vouchTarget, setVouchTarget] = useState(""); const [reason, setReason] = useState(""); const [done, setDone] = useState(false);
  const [tab, setTab] = useState<"lookup" | "vouch">("lookup");

  const isValidLookup = lookupAddr.length === 42 && lookupAddr.startsWith("0x");
  const { data: vouches, refetch } = useReadContract({ address: ADDR, abi: ABI, functionName: "getVouches", args: [lookupAddr as `0x${string}`], query: { enabled: isValidLookup } });
  const { data: score } = useReadContract({ address: ADDR, abi: ABI, functionName: "trustScore", args: [lookupAddr as `0x${string}`], query: { enabled: isValidLookup } });
  const { data: alreadyVouched } = useReadContract({ address: ADDR, abi: ABI, functionName: "hasVouchedFor", args: [address!, lookupAddr as `0x${string}`], query: { enabled: !!address && isValidLookup } });
  const { data: myScore } = useReadContract({ address: ADDR, abi: ABI, functionName: "trustScore", args: [address!], query: { enabled: !!address } });
  const { data: totalVouches } = useReadContract({ address: ADDR, abi: ABI, functionName: "totalVouches" });

  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  if (isSuccess && !done) { setDone(true); refetch(); setReason(""); setVouchTarget(""); setTimeout(() => setDone(false), 3000); }
  const isLoading = isPending || isConfirming;

  const vouchList = (vouches as any[]) ?? [];

  function trustLabel(score: number): string {
    if (score === 0) return "Unknown";
    if (score < 3) return "New";
    if (score < 10) return "Trusted";
    if (score < 25) return "Well-Known";
    return "Community Pillar";
  }

  function trustColor(score: number): string {
    if (score === 0) return "#64748b";
    if (score < 3) return "#f59e0b";
    if (score < 10) return "#22c55e";
    if (score < 25) return AC;
    return "#a855f7";
  }

  return (
    <div className="min-h-screen bg-[#080b14]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 z-50 bg-[#080b14]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="font-bold text-white text-lg">Vouch<span style={{ color: AC }}>Safe</span></span>
          <span className="hidden sm:block text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700">Arc Testnet</span>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
      </header>
      <main className="relative z-10 max-w-xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🛡️</div>
          <h1 className="text-4xl font-black text-white mb-3">Vouch<span style={{ color: AC }}>Safe</span></h1>
          <p className="text-slate-400 text-sm">Vouch for wallets you trust. Build an on-chain reputation graph.</p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-full border border-slate-700 text-slate-400 text-sm">{totalVouches?.toString() ?? "0"} total vouches</div>
            {isConnected && myScore !== undefined && (
              <div className="inline-flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-full border border-slate-700 text-sm" style={{ color: trustColor(Number(myScore)) }}>Your score: {myScore.toString()}</div>
            )}
          </div>
        </div>

        <div className="flex bg-slate-900/60 rounded-xl p-1 mb-5 border border-white/8">
          {(["lookup", "vouch"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "text-white" : "text-slate-400 hover:text-white"}`} style={tab === t ? { background: AC } : {}}>
              {t === "lookup" ? "🔍 Look Up Trust" : "🛡️ Vouch for Someone"}
            </button>
          ))}
        </div>

        {tab === "lookup" && (
          <div>
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 mb-4">
              <h3 className="font-bold text-white mb-3">Check Trust Score</h3>
              <input value={lookupAddr} onChange={e => setLookupAddr(e.target.value)} placeholder="0x... wallet address" className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-mono" />
            </div>

            {isValidLookup && score !== undefined && (
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 mb-4">
                <div className="text-center mb-4">
                  <p className="text-slate-400 text-xs mb-1">{shortAddr(lookupAddr)}</p>
                  <div className="text-5xl font-black mb-2" style={{ color: trustColor(Number(score)) }}>{score.toString()}</div>
                  <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: trustColor(Number(score)) + "25", color: trustColor(Number(score)) }}>{trustLabel(Number(score))}</span>
                </div>
                {isConnected && lookupAddr.toLowerCase() !== address?.toLowerCase() && (
                  <div className="flex gap-2">
                    {!alreadyVouched ? (
                      <button onClick={() => { setVouchTarget(lookupAddr); setTab("vouch"); }} className="flex-1 py-2 rounded-xl font-bold text-sm text-white" style={{ background: AC }}>+ Vouch for this wallet</button>
                    ) : (
                      <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "unvouch", args: [lookupAddr as `0x${string}`] })} disabled={isLoading} className="flex-1 py-2 rounded-xl font-bold text-sm text-red-400 border border-red-400/30 disabled:opacity-50 hover:bg-red-400/10 transition-all">{isLoading ? "..." : "✕ Remove my vouch"}</button>
                    )}
                  </div>
                )}
                {done && <p className="mt-2 text-xs text-center" style={{ color: AC }}>✅ Vouch removed!</p>}
                {error && <p className="mt-2 text-red-400 text-xs text-center">{error.message?.includes("User rejected") ? "Cancelled" : error.message?.slice(0, 80)}</p>}
              </div>
            )}

            {vouchList.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-white mb-3">Vouched by ({vouchList.length})</h3>
                <div className="space-y-2">
                  {vouchList.map((v: any, i: number) => (
                    <div key={i} className="bg-slate-900/60 border border-white/8 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs" style={{ color: AC }}>{shortAddr(v.from)}</span>
                        <span className="text-slate-600 text-xs">{formatDistanceToNow(Number(v.timestamp))}</span>
                      </div>
                      <p className="text-slate-300 text-sm">"{v.reason}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isValidLookup && vouchList.length === 0 && score !== undefined && (
              <div className="text-center py-6 text-slate-500 text-sm">No vouches yet for this address</div>
            )}
          </div>
        )}

        {tab === "vouch" && (
          !isConnected ? <div className="text-center py-8 text-slate-500">Connect wallet to vouch</div> : (
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 mb-5">
              <h2 className="font-bold text-white mb-4">Vouch for a Wallet 🛡️</h2>
              <input value={vouchTarget} onChange={e => setVouchTarget(e.target.value)} placeholder="Wallet to vouch for 0x... *" className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none font-mono mb-2" />
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why do you vouch for this wallet? *" rows={3} className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none mb-3" />
              {done ? <div className="py-3 text-center rounded-xl font-bold text-sm" style={{ background: `${AC}20`, color: AC }}>🛡️ Vouch submitted!</div>
                : <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "vouch", args: [vouchTarget as `0x${string}`, reason] })} disabled={isLoading || vouchTarget.length !== 42 || !reason} className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50" style={{ background: AC }}>{isLoading ? (isPending ? "Confirm..." : "Vouching...") : "🛡️ Submit Vouch"}</button>}
              {error && <p className="mt-2 text-red-400 text-xs text-center">{error.message?.includes("User rejected") ? "Cancelled" : error.message?.slice(0, 80)}</p>}
            </div>
          )
        )}
        <footer className="mt-10 text-center text-xs text-slate-600"><p>VouchSafe · <a href={`https://testnet.arcscan.app/address/${ADDR}`} target="_blank" rel="noreferrer" className="hover:text-slate-400">{ADDR.slice(0,6)}...{ADDR.slice(-4)}</a> · Chain {arcTestnet.id}</p></footer>
      </main>
    </div>
  );
}
