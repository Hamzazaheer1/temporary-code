"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLoginWithEmail, usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/contexts/AuthContext";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./sign-in.css";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const router = useRouter();
  const { signin } = useAuth();
  const { getAccessToken } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail({
    onComplete: async (params) => {
      try {
        // Get Privy access token
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("Failed to get access token");
        }
        // Sign in with backend using Privy token
        await signin(email, accessToken);
        // Redirect to dashboard
        router.push("/");
      } catch (error) {
        console.error("Error completing login:", error);
      }
    },
    onError: (error) => {
      console.error("Privy login error:", error);
    },
  });

  useEffect(() => {
    // Add body class for scoped CSS
    document.body.classList.add("sign-in-page");
    return () => {
      document.body.classList.remove("sign-in-page");
    };
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await sendCode({ email });
      setShowCodeInput(true);
    } catch (error: any) {
      console.error("Error sending code:", error);
      // Show user-friendly error message
      if (
        error?.message?.includes("PrivyProvider") ||
        error?.message?.includes("app id")
      ) {
        alert(
          "Privy is not configured. Please add NEXT_PUBLIC_PRIVY_APP_ID to your .env.local file and restart the dev server."
        );
      }
    }
  };

  const handleLoginWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    try {
      await loginWithCode({ code });
    } catch (error) {
      console.error("Error logging in with code:", error);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = `${
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    }/api/auth/google`;
  };

  return (
    <section className="main-div p-8">
      <div className="container max-lg:h-full grid lg:grid-cols-2 lg:items-center max-lg:py-5 mx-auto">
        <div className="max-lg:flex max-lg:flex-col max-lg:justify-between max-lg:h-full">
          <div className="logo flex items-center gap-2">
            <Image
              src="/assets/logo.png"
              alt="logo"
              width={38}
              height={38}
              className="object-contain"
            />
            <span className="text-white md:text-black lg:text-col-4 font-semibold text-xl leading-6">
              Sendana
            </span>
          </div>
          <div className="login-menu">
            <div>
              <h1 className="font-semibold text-2xl lg:text-4xl leading-full tracking-small text-col-6 mb-4 lg:mb-7">
                Welcome 👋
              </h1>
              <p className="font-normal text-sm lg:text-base leading-[160%] tracking-small text-col-7">
                Today is a new day. It&apos;s your day. You shape it. Sign in to
                start managing your transactions.
              </p>
            </div>
            <div>
              {!showCodeInput ? (
                <form
                  onSubmit={handleSendCode}
                  className="grid gap-y-4 lg:gap-y-6"
                >
                  {state.status === "error" && state.error && (
                    <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
                      {state.error.message || "Failed to send code"}
                    </div>
                  )}
                  <div className="flex flex-col gap-y-2">
                    <label htmlFor="email" className="form-label">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-input"
                      placeholder="Example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={state.status === "sending-code"}
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="form-btn"
                      disabled={state.status === "sending-code" || !email}
                    >
                      {state.status === "sending-code"
                        ? "Sending code..."
                        : "Send Code"}
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={handleLoginWithCode}
                  className="grid gap-y-4 lg:gap-y-6"
                >
                  {state.status === "error" && state.error && (
                    <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
                      {state.error.message || "Failed to verify code"}
                    </div>
                  )}
                  <div className="flex flex-col gap-y-2">
                    <label htmlFor="code" className="form-label">
                      Enter verification code
                    </label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      className="form-input"
                      placeholder="123456"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      required
                      disabled={state.status === "submitting-code"}
                      maxLength={6}
                    />
                    <p className="text-xs text-col-10 mt-1">
                      We sent a code to {email}
                    </p>
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="form-btn"
                      disabled={
                        state.status === "submitting-code" || code.length !== 6
                      }
                    >
                      {state.status === "submitting-code"
                        ? "Verifying..."
                        : "Verify Code"}
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCodeInput(false);
                        setCode("");
                      }}
                      className="text-sm text-col-11 hover:underline"
                    >
                      Use a different email
                    </button>
                  </div>
                </form>
              )}
            </div>
            <div>
              <div className="text-center middle-border relative">
                <span className="font-normal text-sm leading-8.5 tracking-small text-col-12 mx-auto inline-block">
                  Or
                </span>
              </div>
              <div className="grid max-lg:grid-cols-2 gap-4 mt-4 lg:mt-6">
                <div>
                  <button
                    type="button"
                    className="extra-login-btn"
                    onClick={handleGoogleSignIn}
                  >
                    <span>
                      <svg
                        width="21"
                        height="20"
                        viewBox="0 0 21 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_260_28785)">
                          <path
                            d="M20.305 10.2303C20.305 9.55056 20.2499 8.86711 20.1323 8.19836H10.7V12.0492H16.1015C15.8773 13.2911 15.1571 14.3898 14.1026 15.0879V17.5866H17.325C19.2174 15.8449 20.305 13.2728 20.305 10.2303Z"
                            fill="#4285F4"
                          />
                          <path
                            d="M10.7 20.0007C13.397 20.0007 15.6715 19.1152 17.3287 17.5866L14.1062 15.088C13.2096 15.6979 12.0522 16.0433 10.7037 16.0433C8.0948 16.0433 5.88279 14.2833 5.08911 11.9169H1.76373V14.4927C3.46133 17.8695 6.91898 20.0007 10.7 20.0007Z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.08546 11.9169C4.66657 10.6749 4.66657 9.33008 5.08546 8.08811V5.51233H1.76376C0.345428 8.33798 0.345428 11.667 1.76376 14.4927L5.08546 11.9169Z"
                            fill="#FBBC04"
                          />
                          <path
                            d="M10.7 3.95805C12.1257 3.936 13.5036 4.47247 14.5361 5.45722L17.3911 2.60218C15.5833 0.904588 13.1839 -0.0287217 10.7 0.000673889C6.91898 0.000673889 3.46133 2.13185 1.76373 5.51234L5.08543 8.08813C5.87543 5.71811 8.09112 3.95805 10.7 3.95805Z"
                            fill="#EA4335"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_260_28785">
                            <rect
                              width="20"
                              height="20"
                              fill="white"
                              transform="translate(0.5)"
                            />
                          </clipPath>
                        </defs>
                      </svg>
                    </span>
                    <span className="max-lg:hidden lg:block">
                      Sign in with Google
                    </span>
                    <span className="max-lg:block lg:hidden">Google</span>
                  </button>
                </div>
                <div>
                  <button type="button" className="extra-login-btn">
                    <span>
                      <svg
                        width="17"
                        height="20"
                        viewBox="0 0 17 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12.4775 0.0100088C12.435 -0.0374912 10.9038 0.0287588 9.57128 1.47501C8.23878 2.92001 8.44378 4.57751 8.47378 4.62001C8.50378 4.66251 10.3738 4.72876 11.5675 3.04751C12.7613 1.36626 12.52 0.0587588 12.4775 0.0100088ZM16.62 14.6763C16.56 14.5563 13.7138 13.1338 13.9788 10.3988C14.2438 7.66376 16.0725 6.91251 16.1013 6.83126C16.13 6.75001 15.355 5.84376 14.5338 5.38501C13.9307 5.06189 13.2634 4.8766 12.58 4.84251C12.445 4.83876 11.9763 4.72376 11.0125 4.98751C10.3775 5.16126 8.94628 5.72376 8.55253 5.74626C8.15753 5.76876 6.98253 5.09376 5.71878 4.91501C4.91003 4.75876 4.05253 5.07876 3.43878 5.32501C2.82628 5.57001 1.66128 6.26751 0.846279 8.12126C0.0312793 9.97376 0.457529 12.9088 0.762529 13.8213C1.06753 14.7338 1.54378 16.2263 2.35378 17.3163C3.07378 18.5463 4.02878 19.4 4.42753 19.69C4.82628 19.98 5.95128 20.1725 6.73128 19.7738C7.35878 19.3888 8.49128 19.1675 8.93878 19.1838C9.38503 19.2 10.265 19.3763 11.1663 19.8575C11.88 20.1038 12.555 20.0013 13.2313 19.7263C13.9075 19.45 14.8863 18.4025 16.0288 16.2788C16.4621 15.2913 16.6592 14.7571 16.62 14.6763Z"
                          fill="#111827"
                        />
                        <path
                          d="M12.4775 0.0100088C12.435 -0.0374912 10.9038 0.0287588 9.57128 1.47501C8.23878 2.92001 8.44378 4.57751 8.47378 4.62001C8.50378 4.66251 10.3738 4.72876 11.5675 3.04751C12.7613 1.36626 12.52 0.0587588 12.4775 0.0100088ZM16.62 14.6763C16.56 14.5563 13.7138 13.1338 13.9788 10.3988C14.2438 7.66376 16.0725 6.91251 16.1013 6.83126C16.13 6.75001 15.355 5.84376 14.5338 5.38501C13.9307 5.06189 13.2634 4.8766 12.58 4.84251C12.445 4.83876 11.9763 4.72376 11.0125 4.98751C10.3775 5.16126 8.94628 5.72376 8.55253 5.74626C8.15753 5.76876 6.98253 5.09376 5.71878 4.91501C4.91003 4.75876 4.05253 5.07876 3.43878 5.32501C2.82628 5.57001 1.66128 6.26751 0.846279 8.12126C0.0312793 9.97376 0.457529 12.9088 0.762529 13.8213C1.06753 14.7338 1.54378 16.2263 2.35378 17.3163C3.07378 18.5463 4.02878 19.4 4.42753 19.69C4.82628 19.98 5.95128 20.1725 6.73128 19.7738C7.35878 19.3888 8.49128 19.1675 8.93878 19.1838C9.38503 19.2 10.265 19.3763 11.1663 19.8575C11.88 20.1038 12.555 20.0013 13.2313 19.7263C13.9075 19.45 14.8863 18.4025 16.0288 16.2788C16.4621 15.2913 16.6592 14.7571 16.62 14.6763Z"
                          fill="#111827"
                        />
                      </svg>
                    </span>
                    <span className="hidden lg:block">Sign in with Apple</span>
                    <span className="max-lg:block lg:hidden">Apple</span>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <p className="text-center font-roboto font-normal leading-[160%] tracking-small text-base text-col-7">
                Don&apos;t you have an account?{" "}
                <Link href="/sign-up" className="text-col-11">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
          <div>
            <p className="font-normal text-xs lg:text-sm leading-full tracking-small text-center text-col-5">
              © 2025 ALL RIGHTS RESERVED
            </p>
          </div>
        </div>
        <div className="max-lg:hidden swiper-container-wrapper">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            loop={true}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            navigation={{
              nextEl: ".swiper-button-next",
              prevEl: ".swiper-button-prev",
            }}
            pagination={{
              el: ".swiper-pagination",
              clickable: true,
            }}
            className="loginart h-[834px]"
          >
            <SwiperSlide className="relative">
              <div className="loginart-image h-[834px] relative">
                <Image
                  src="/assets/login-art-1.jpg"
                  alt="login-art-1"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 0vw, 50vw"
                />
              </div>
              <div className="loginart-text">
                <h3>Borderless banking starts here.</h3>
                <p>
                  Receive, send and manage multiple currencies in one app. Open
                  a foreign bank account for free.
                </p>
              </div>
            </SwiperSlide>
            <SwiperSlide className="relative">
              <div className="loginart-image h-[834px] relative">
                <Image
                  src="/assets/login-art-2.jpg"
                  alt="login-art-2"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 0vw, 50vw"
                  unoptimized
                />
              </div>
              <div className="loginart-text">
                <h3>
                  From &apos;just down the road&apos; to &apos;halfway across
                  the globe&apos;.
                </h3>
                <p>
                  Send money to anyone, just about anywhere. Sendana-to-Sendana
                  transfers are free!
                </p>
              </div>
            </SwiperSlide>
            <SwiperSlide className="relative">
              <div className="loginart-image h-[834px] relative">
                <Image
                  src="/assets/login-art-1.jpg"
                  alt="login-art-1"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 0vw, 50vw"
                />
              </div>
              <div className="loginart-text">
                <h3>Borderless banking starts here.</h3>
                <p>
                  Receive, send and manage multiple currencies in one app. Open
                  a foreign bank account for free.
                </p>
              </div>
            </SwiperSlide>
            <SwiperSlide className="relative">
              <div className="loginart-image h-[834px] relative">
                <Image
                  src="/assets/login-art-2.jpg"
                  alt="login-art-2"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 0vw, 50vw"
                  unoptimized
                />
              </div>
              <div className="loginart-text">
                <h3>
                  From &apos;just down the road&apos; to &apos;halfway across
                  the globe&apos;.
                </h3>
                <p>
                  Send money to anyone, just about anywhere. Sendana-to-Sendana
                  transfers are free!
                </p>
              </div>
            </SwiperSlide>
          </Swiper>
          <div className="swiper-button-next"></div>
          <div className="swiper-button-prev"></div>
          <div className="swiper-pagination swiper-pagination-custom"></div>
        </div>
      </div>
    </section>
  );
}
