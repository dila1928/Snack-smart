import Signup from './signup'
import { useEffect, useMemo } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Lenis } from "lenis/react"
import { ScrollToTop } from "./ScrollToTop"
import Login from './Login'
import Home from './Home'
import Profile from './Profile'
import ResetPassword from './ResetPassword'
import FoodMenu from './FoodMenu'
import Inventory from './Inventory'
import AdminDashboard from './AdminDashboard'
import AdminPendingOrders from './AdminPendingOrders'
import MyOrders from './MyOrders'
import OrderDetail from './OrderDetail'
import Cart from './Cart'
import Checkout from './Checkout'
import OrderConfirmed from './OrderConfirmed'
import OrderReviews from './OrderReviews'
import { clearLegacyAuthFromLocalStorage } from "./authSession"
import RequireAdmin from "./RequireAdmin"
import { CartProvider } from "./CartContext"
import { SnackBot } from "./SnackBot"

function App() {
  useEffect(() => {
    clearLegacyAuthFromLocalStorage()
  }, [])

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  )

  const lenisOptions = useMemo(
    () => ({
      smoothWheel: true,
      lerp: 0.09,
      anchors: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    }),
    []
  )

  const routesTree = (
    <>
      <ScrollToTop />
      <SnackBot />
      <div style={{ flex: "1 1 auto", width: "100%", display: "flex", flexDirection: "column" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/register" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/home" element={<Home />} />
          <Route path="/food" element={<FoodMenu />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/pending-orders"
            element={
              <RequireAdmin>
                <AdminPendingOrders />
              </RequireAdmin>
            }
          />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/orders/:orderId" element={<OrderDetail />} />
          <Route
            path="/inventory"
            element={
              <RequireAdmin>
                <Inventory />
              </RequireAdmin>
            }
          />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmed" element={<OrderConfirmed />} />
          <Route path="/order-reviews" element={<OrderReviews />} />
          <Route path="/my-reviews" element={<OrderReviews />} />
          <Route path="/delivery" element={<Navigate to="/home" replace />} />
          <Route path="/faq" element={<Navigate to="/home" replace />} />
          <Route path="/contact" element={<Navigate to="/home" replace />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </>
  )

  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex", flexDirection: "column", flex: 1 }}>
      <BrowserRouter>
        <CartProvider>
          {prefersReducedMotion ? routesTree : (
            <Lenis root options={lenisOptions}>
              {routesTree}
            </Lenis>
          )}
        </CartProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
