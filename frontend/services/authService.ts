import axios from "axios";

export const registerUser = async (data: {
  fullName: string;
  role: string;
  email: string;
  password: string;
}) => {
  const response = await axios.post("/api/auth/register", data);
  return response.data;
};

export const loginUser = async (data: { email: string; password: string }) => {
  const response = await axios.post("/api/auth/credentials", data);
  return response.data;
};
