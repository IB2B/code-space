import axios, { AxiosInstance } from "axios";

const client: AxiosInstance = axios.create({
  timeout: 3000,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl: string = error.config?.url || "";
    const isAuthRoute =
      typeof window !== "undefined" &&
      ["/login", "/register", "/auth/forgot-password"].includes(
        window.location.pathname,
      );
    const isLoginRequest = requestUrl.includes("/users/login");

    if (status === 401 && !isAuthRoute && !isLoginRequest) {
      console.log(error);
      window.localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const request = client;
