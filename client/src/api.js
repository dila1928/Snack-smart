import axios from "axios";

const base =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "/api" : "http://localhost:3001/api");

export const api = axios.create({
    baseURL: base.replace(/\/$/, ""),
});
