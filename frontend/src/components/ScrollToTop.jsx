import { useLocation } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import { trackPageView } from '@/utils/analytics';

const ScrollToTop = () => {
    const { pathname, search } = useLocation();

    useLayoutEffect(() => {
        if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        const scrollTop = () => {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        };
        scrollTop();
        const frame1 = window.requestAnimationFrame(() => {
            scrollTop();
            window.requestAnimationFrame(scrollTop);
        });
        const t0 = window.setTimeout(scrollTop, 0);
        const t1 = window.setTimeout(scrollTop, 50);
        trackPageView(`${pathname}${search}`, document.title);
        return () => {
            window.cancelAnimationFrame(frame1);
            window.clearTimeout(t0);
            window.clearTimeout(t1);
        };
    }, [pathname, search]);

    return null;
}

export default ScrollToTop;
