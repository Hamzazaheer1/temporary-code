"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCodeSVG from "react-qr-code";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import "@/components/Dashboard.css";

export default function WalletAddressPage() {
  const { user, loading, authenticated } = useAuth();
  const router = useRouter();

  const walletAddress = user?.walletAddress || "No wallet address";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  useEffect(() => {
    if (!loading && !authenticated) {
      router.push("/sign-in");
    }
  }, [authenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-dvh">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    return null; // Will redirect to sign-in
  }

  return (
    <DashboardLayout
      activeRoute="/wallet-address"
      header={
        <>
          <h1 className="font-semibold text-lg lg:text-3xl leading-[135%] lg:leading-[38px] mb-1 text-col-7">
            Wallet Address
          </h1>
          <p className="font-normal text-xs leading-[150%] lg:text-base text-col-8">
            View and share your wallet address
          </p>
        </>
      }
    >
      {/* Wallet Address Card */}
      {walletAddress !== "No wallet address" ? (
        <div className="bg-col-4 p-6 lg:p-8 rounded-2xl mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row justify-between gap-6 lg:gap-8 items-center lg:items-start">
            {/* Left side - Wallet Address */}
            <div className="flex-1 w-full lg:w-auto">
              <h3 className="font-medium text-base lg:text-lg leading-6 text-col-11 mb-4 lg:mb-6">
                Wallet Address
              </h3>
              <div className="bg-col-3 rounded-xl p-4 lg:p-5 mb-4">
                <div className="flex items-center justify-between gap-x-3">
                  <p className="font-semibold text-sm lg:text-base text-black break-all font-mono flex-1">
                    {walletAddress}
                  </p>
                  <button
                    className="cursor-pointer hover:opacity-70 transition-opacity shrink-0 bg-black hover:bg-black rounded-lg p-2"
                    onClick={() => copyToClipboard(walletAddress)}
                    title="Copy wallet address"
                  >
                    <i className="fa-regular fa-clone text-white text-base lg:text-lg"></i>
                  </button>
                </div>
              </div>
              <p className="font-normal text-sm lg:text-base text-col-12">
                Share this address to receive payments
              </p>
            </div>

            {/* Right side - QR Code */}
            <div className="shrink-0">
              <div className="bg-white p-4 lg:p-6 rounded-2xl">
                <QRCodeSVG
                  value={walletAddress}
                  size={200}
                  level="M"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
              <p className="font-normal text-xs lg:text-sm text-col-12 text-center mt-3">
                Scan to receive payments
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-col-10 p-6 lg:p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center min-w-16 min-h-16 lg:min-w-20 lg:min-h-20 rounded-full bg-col-3 mb-4">
              <i className="fa-solid fa-wallet text-col-4 text-2xl lg:text-3xl"></i>
            </div>
            <h3 className="font-semibold text-lg lg:text-xl text-col-5 mb-2">
              No Wallet Address
            </h3>
            <p className="font-normal text-sm lg:text-base text-col-8">
              You don't have a wallet address yet. Please connect your wallet to
              continue.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
