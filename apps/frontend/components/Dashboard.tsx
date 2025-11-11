"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const userName = user?.name || "User";

  return (
    <DashboardLayout
      activeRoute="/"
      header={
        <>
          <h1 className="font-semibold text-lg lg:text-3xl leading-[135%] lg:leading-[38px] mb-1 text-col-7">
            {getGreeting()}, {userName}! 👋
          </h1>
          <p className="font-normal text-xs leading-[150%] lg:text-base text-col-8">
            Send. Receive. Smile. Repeat.
          </p>
        </>
      }
    >
      {/* Wallet Balance Card */}
      <div className="bg-col-4 p-6 rounded-2xl mb-6 lg:mb-8">
        <div className="flex justify-between gap-x-2 lg:gap-x-4 pb-6 lg:pb-8 border-b border-col-10">
          <div>
            <h3 className="font-medium text-base lg:text-lg leading-6 text-col-11 mb-2.5">
              Wallet Balance
            </h3>
            <h2 className="lg:mb-2.5 mb-1 font-bold text-4xl lg:text-[42.75px] leading-10 lg:leading-12 text-white">
              $12,465
              <span className="lg:text-[27.3px] text-2xl leading-8 ml-2 lg:leading-9">
                .37
              </span>
            </h2>
            <p className="font-normal text-base text-col-12">USDC Balance</p>
          </div>
          <div>
            <span className="inline-flex items-center justify-center min-w-14 min-h-14 rounded-2xl bg-col-10">
              <i className="fa-solid fa-wallet text-white text-xl"></i>
            </span>
          </div>
        </div>
        <div className="pt-6 lg:pt-8">
          <h3 className="font-normal text-sm lg:text-base text-col-12 lg:mb-2.5">
            GYD Equivalent
          </h3>
          <h2 className="font-bold text-xl lg:text-2xl leading-7 flex gap-x-2.5 text-white">
            $2,602,848.62
            <span>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_98_26146)">
                  <path
                    d="M12 0.75C10.0125 0.75 8.13755 1.275 6.52505 2.175L6.48755 21.7875C8.10005 22.725 9.97505 23.25 12 23.25C17.5875 23.25 22.2375 19.1625 23.1 13.8V10.2C22.2375 4.8375 17.5875 0.75 12 0.75Z"
                    fill="#699635"
                  />
                  <path
                    d="M22.5376 11.1L6.5251 3V3.15H5.1001C4.9876 3.2625 4.8376 3.3375 4.7251 3.45V20.5125C4.8376 20.625 4.9876 20.7375 5.1001 20.8125H6.4876V21L22.6876 12.9375C22.7251 12.6375 23.2876 12.3 23.2876 12C23.2876 11.7 22.5376 11.4 22.5376 11.1Z"
                    fill="#FFE62E"
                  />
                  <path
                    d="M5.0625 3.14999L23.25 11.925C23.25 11.325 23.2125 10.7625 23.1 10.2L6.525 2.17499C6 2.47499 5.5125 2.77499 5.0625 3.14999Z"
                    fill="white"
                  />
                  <path
                    d="M4.6875 4.5H3.6C1.8375 6.4875 0.75 9.1125 0.75 12C0.75 14.8875 1.8375 17.5125 3.6 19.5H4.65L12.15 12L4.6875 4.5Z"
                    fill="#ED4C5C"
                  />
                  <path
                    d="M4.6876 3.45001C4.3126 3.78751 3.9376 4.12501 3.6001 4.50001L11.1001 12L3.6001 19.5C3.9376 19.875 4.2751 20.2125 4.6876 20.55L13.2376 12L4.6876 3.45001Z"
                    fill="#3E4347"
                  />
                  <path
                    d="M23.1 13.8C23.175 13.2375 23.25 12.6375 23.25 12.075L5.0625 20.85C5.5125 21.225 6 21.525 6.525 21.825L23.1 13.8Z"
                    fill="white"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_98_26146">
                    <rect width="24" height="24" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </span>
          </h2>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 lg:mb-8 bg-white rounded-2xl flex justify-between items-center px-6 py-5 lg:px-10 lg:py-8">
        <button className="flex max-lg:flex-col cursor-pointer items-center gap-3 lg:h-8">
          <span className="flex items-center justify-center">
            <i className="fa-solid fa-circle-plus text-col-4 text-xl lg:text-[26px]"></i>
          </span>
          <h3 className="font-normal text-sm leading-[150%] lg:text-base text-col-5">
            Add
          </h3>
        </button>
        <button className="flex cursor-pointer max-lg:flex-col items-center gap-3 lg:h-8">
          <span className="flex items-center justify-center">
            <i className="fa-regular fa-paper-plane text-col-4 text-xl lg:text-[26px]"></i>
          </span>
          <h3 className="font-normal text-sm leading-[150%] lg:text-base text-col-5">
            Send
          </h3>
        </button>
        <button className="flex cursor-pointer max-lg:flex-col items-center gap-3 lg:h-8">
          <span className="flex items-center justify-center">
            <i className="fa-solid fa-money-bill-transfer text-col-4 text-xl lg:text-[26px]"></i>
          </span>
          <h3 className="font-normal text-sm leading-[150%] lg:text-base text-col-5">
            Withdraw
          </h3>
        </button>
        <button className="flex cursor-pointer max-lg:flex-col items-center gap-3 lg:h-8">
          <span className="flex items-center justify-center">
            <i className="fa-solid fa-credit-card text-col-4 text-xl lg:text-[26px]"></i>
          </span>
          <h3 className="font-normal text-sm leading-[150%] lg:text-base text-col-5">
            Get Paid
          </h3>
        </button>
      </div>

      {/* Recent Activity and USD Account Details */}
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Recent Activity */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-xl leading-[130%] text-col-5">
              Recent Activity
            </h3>
            <Link
              href="#"
              className="font-medium text-base leading-[145%] text-col-4"
            >
              View All
            </Link>
          </div>
          <div className="border border-col-10 bg-col-13 rounded-2xl">
            {/* Transaction 1 */}
            <div className="p-6 flex items-center justify-between gap-x-4 border-b border-col-14">
              <div className="flex items-center gap-x-4 w-full">
                <span className="min-h-10 min-w-10 inline-flex items-center justify-center bg-col-3 rounded-full">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5.83325 5.83331H14.1666V14.1666"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.83325 14.1666L14.1666 5.83331"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="font-medium text-base text-col-5">
                    Sent to William Chen
                  </h3>
                  <p className="font-normal text-sm text-col-8">
                    Today, 2:34 PM
                  </p>
                </div>
              </div>
              <div className="text-right min-w-fit">
                <h3 className="font-medium text-base text-col-5">-$65.00</h3>
                <p className="font-normal text-sm text-col-8">USDC</p>
              </div>
            </div>

            {/* Transaction 2 */}
            <div className="p-6 flex items-center justify-between gap-x-4 border-b border-col-14">
              <div className="flex items-center gap-x-4 w-full">
                <span className="min-h-10 min-w-10 inline-flex items-center justify-center bg-col-3 rounded-full">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 18.3334V3.33335C5 2.89133 5.17559 2.4674 5.48816 2.15484C5.80072 1.84228 6.22464 1.66669 6.66667 1.66669H13.3333C13.7754 1.66669 14.1993 1.84228 14.5118 2.15484C14.8244 2.4674 15 2.89133 15 3.33335V18.3334H5Z"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.00008 10H3.33341C2.89139 10 2.46746 10.1756 2.1549 10.4882C1.84234 10.8007 1.66675 11.2246 1.66675 11.6667V16.6667C1.66675 17.1087 1.84234 17.5326 2.1549 17.8452C2.46746 18.1577 2.89139 18.3333 3.33341 18.3333H5.00008"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 7.5H16.6667C17.1087 7.5 17.5326 7.6756 17.8452 7.98816C18.1577 8.30072 18.3333 8.72464 18.3333 9.16667V16.6667C18.3333 17.1087 18.1577 17.5326 17.8452 17.8452C17.5326 18.1577 17.1087 18.3333 16.6667 18.3333H15"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.33325 5H11.6666"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.33325 8.33331H11.6666"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.33325 11.6667H11.6666"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.33325 15H11.6666"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="font-medium text-base text-col-5">
                    ATM Withdrawal
                  </h3>
                  <p className="font-normal text-sm text-col-8">
                    Jun 20, 4:45 PM
                  </p>
                </div>
              </div>
              <div className="text-right min-w-fit">
                <h3 className="font-medium text-base text-col-5">-$100.00</h3>
                <p className="font-normal text-sm text-col-8">GYD</p>
              </div>
            </div>

            {/* Transaction 3 */}
            <div className="p-6 flex items-center justify-between gap-x-4 border-b border-col-14">
              <div className="flex items-center gap-x-4 w-full">
                <span className="min-h-10 min-w-10 inline-flex items-center justify-center bg-col-3 rounded-full">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14.1666 5.83331L5.83325 14.1666"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14.1666 14.1666H5.83325V5.83331"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="font-medium text-base text-col-5">
                    Received from ACME Corp
                  </h3>
                  <p className="font-normal text-sm text-col-8">
                    Yesterday, 11:22 AM
                  </p>
                </div>
              </div>
              <div className="text-right min-w-fit">
                <h3 className="font-medium text-base text-col-15">
                  +$2,500.72
                </h3>
                <p className="font-normal text-sm text-col-8">USDC</p>
              </div>
            </div>

            {/* Transaction 4 */}
            <div className="p-6 flex items-center justify-between gap-x-4">
              <div className="flex items-center gap-x-4 w-full">
                <span className="min-h-10 min-w-10 inline-flex items-center justify-center bg-col-3 rounded-full">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 18.3334V3.33335C5 2.89133 5.17559 2.4674 5.48816 2.15484C5.80072 1.84228 6.22464 1.66669 6.66667 1.66669H13.3333C13.7754 1.66669 14.1993 1.84228 14.5118 2.15484C14.8244 2.4674 15 2.89133 15 3.33335V18.3334H5Z"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.00008 10H3.33341C2.89139 10 2.46746 10.1756 2.1549 10.4882C1.84234 10.8007 1.66675 11.2246 1.66675 11.6667V16.6667C1.66675 17.1087 1.84234 17.5326 2.1549 17.8452C2.46746 18.1577 2.89139 18.3333 3.33341 18.3333H5.00008"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 7.5H16.6667C17.1087 7.5 17.5326 7.6756 17.8452 7.98816C18.1577 8.30072 18.3333 8.72464 18.3333 9.16667V16.6667C18.3333 17.1087 18.1577 17.5326 17.8452 17.8452C17.5326 18.1577 17.1087 18.3333 16.6667 18.3333H15"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.33325 5H11.6666"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.33325 8.33331H11.6666"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.33325 11.6667H11.6666"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.33325 15H11.6666"
                      stroke="#5F2DC4"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="font-medium text-base text-col-5">
                    ATM Withdrawal
                  </h3>
                  <p className="font-normal text-sm text-col-8">
                    Jun 20, 4:45 PM
                  </p>
                </div>
              </div>
              <div className="text-right min-w-fit">
                <h3 className="font-medium text-base text-col-5">-$100.00</h3>
                <p className="font-normal text-sm text-col-8">GYD</p>
              </div>
            </div>
          </div>
        </div>

        {/* USD Account Details */}
        <div>
          <div className="mb-4">
            <h3 className="font-semibold text-xl leading-[130%] text-col-5">
              USD Account Details
            </h3>
          </div>
          <div className="border border-col-10 bg-col-13 rounded-2xl p-6">
            <div>
              {/* Account Number 1 */}
              <div className="bg-col-3 rounded-xl mb-4 p-4">
                <h4 className="font-normal text-base leading-5 text-col-16 mb-2">
                  Account Number
                </h4>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[16.88px] leading-7 text-col-5">
                    021000567
                  </h3>
                  <button className="h-8 cursor-pointer w-8 inline-flex justify-center items-center">
                    <i className="fa-regular fa-clone fa-flip-horizontal text-col-6"></i>
                  </button>
                </div>
              </div>

              {/* Account Number 2 */}
              <div className="bg-col-3 rounded-xl mb-4 p-4">
                <h4 className="font-normal text-base leading-5 text-col-16 mb-2">
                  Account Number
                </h4>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[16.88px] leading-7 text-col-5">
                    65532108802
                  </h3>
                  <button className="h-8 cursor-pointer w-8 inline-flex justify-center items-center">
                    <i className="fa-regular fa-clone fa-flip-horizontal text-col-6"></i>
                  </button>
                </div>
              </div>

              {/* Account Info */}
              <div>
                <ul className="grid gap-y-3">
                  <li className="flex items-center justify-between">
                    <p className="font-normal text-base leading-[140%] text-col-8">
                      Bank Name
                    </p>
                    <h3 className="font-medium text-base leading-5 text-col-5">
                      Lead Bank Inc
                    </h3>
                  </li>
                  <li className="flex items-center justify-between">
                    <p className="font-normal text-base leading-[140%] text-col-8">
                      Account Type
                    </p>
                    <h3 className="font-medium text-base leading-5 text-col-5">
                      Checking
                    </h3>
                  </li>
                  <li className="flex items-center justify-between">
                    <p className="font-normal text-base leading-[140%] text-col-8">
                      Status
                    </p>
                    <h3 className="font-medium text-base leading-5 text-col-19 bg-col-18 rounded-[999px] px-2 py-1 flex items-center gap-x-1">
                      <span className="w-2 h-2 rounded-full bg-col-17"></span>
                      Active
                    </h3>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
