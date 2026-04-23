import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAdminSession } from "./authSession";

/** Blocks /admin, /inventory, etc. until staff signs in via Login → Canteen staff. */
export default function RequireAdmin({ children }) {
    const location = useLocation();
    if (!isAdminSession()) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: `${location.pathname}${location.search || ""}` }}
            />
        );
    }
    return children;
}
