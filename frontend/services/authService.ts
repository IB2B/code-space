import axios from "axios";

export const loginUser = async (data: { email: string; password: string }) => {
  const response = await axios.post("/api/auth/credentials", data);
  return response.data;
};
