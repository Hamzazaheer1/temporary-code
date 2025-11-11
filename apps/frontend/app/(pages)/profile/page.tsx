"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import "@/components/Dashboard.css";

export default function ProfilePage() {
  const { user, loading, authenticated } = useAuth();
  const router = useRouter();

  const userName = user?.name || "User";
  const userEmail = user?.email || "No email";
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
      activeRoute="/profile"
      header={
        <>
          <h1 className="font-semibold text-lg lg:text-3xl leading-[135%] lg:leading-[38px] mb-1 text-col-7">
            Profile
          </h1>
          <p className="font-normal text-xs leading-[150%] lg:text-base text-col-8">
            View and manage your account information
          </p>
        </>
      }
    >
      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-col-10 p-6 lg:p-8 mb-6 lg:mb-8">
        <div className="flex items-center gap-x-4 mb-6 lg:mb-8">
          <div className="min-h-16 min-w-16 lg:min-h-20 lg:min-w-20 inline-flex items-center justify-center bg-col-3 rounded-full">
            <Image
              src="/assets/avatar.png"
              alt="avatar"
              width={80}
              height={80}
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-full"
            />
          </div>
          <div>
            <h2 className="font-semibold text-xl lg:text-2xl leading-7 text-col-5 mb-1">
              {userName}
            </h2>
            <p className="font-normal text-sm lg:text-base text-col-8">
              Account Information
            </p>
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-4 lg:space-y-6">
          {/* Name */}
          <div className="bg-col-3 rounded-xl p-4 lg:p-6">
            <h4 className="font-normal text-base leading-5 text-col-16 mb-2 lg:mb-3">
              Name
            </h4>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[16.88px] lg:text-lg leading-7 text-col-5">
                {userName}
              </h3>
              <button
                className="h-8 cursor-pointer w-8 inline-flex justify-center items-center hover:opacity-70 transition-opacity"
                onClick={() => copyToClipboard(userName)}
                title="Copy name"
              >
                <i className="fa-regular fa-clone fa-flip-horizontal text-col-6"></i>
              </button>
            </div>
          </div>

          {/* Email */}
          <div className="bg-col-3 rounded-xl p-4 lg:p-6">
            <h4 className="font-normal text-base leading-5 text-col-16 mb-2 lg:mb-3">
              Email
            </h4>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[16.88px] lg:text-lg leading-7 text-col-5 break-all">
                {userEmail}
              </h3>
              <button
                className="h-8 cursor-pointer w-8 inline-flex justify-center items-center hover:opacity-70 transition-opacity"
                onClick={() => copyToClipboard(userEmail)}
                title="Copy email"
              >
                <i className="fa-regular fa-clone fa-flip-horizontal text-col-6"></i>
              </button>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="bg-col-3 rounded-xl p-4 lg:p-6">
            <h4 className="font-normal text-base leading-5 text-col-16 mb-2 lg:mb-3">
              Wallet Address
            </h4>
            <div className="flex items-center justify-between gap-x-2">
              <h3 className="font-semibold text-[16.88px] lg:text-lg leading-7 text-col-5 break-all font-mono">
                {walletAddress}
              </h3>
              {walletAddress !== "No wallet address" && (
                <button
                  className="h-8 cursor-pointer w-8 inline-flex justify-center items-center hover:opacity-70 transition-opacity shrink-0"
                  onClick={() => copyToClipboard(walletAddress)}
                  title="Copy wallet address"
                >
                  <i className="fa-regular fa-clone fa-flip-horizontal text-col-6"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
