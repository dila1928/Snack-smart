import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLenis } from "lenis/react";

/** Resets scroll position on route changes (hash links keep default anchor behavior). */
export function ScrollToTop() {
    const { pathname, hash } = useLocation();
    const lenis = useLenis();

    useEffect(() => {
        if (hash) return;
        if (lenis) {
            lenis.scrollTo(0, { immediate: true });
        } else {
            window.scrollTo(0, 0);
        }
    }, [pathname, hash, lenis]);

    return null;
}
