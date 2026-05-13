import { useEffect, useRef, useState, useCallback } from "react";
import Masonry from "react-masonry-css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// All 20 graduation images with their natural aspect ratios
const ALL_IMAGES = [
  { src: "/images/grad_01.jpg", aspect: 0.75 },
  { src: "/images/grad_02.jpg", aspect: 1.33 },
  { src: "/images/grad_03.jpg", aspect: 1.5 },
  { src: "/images/grad_04.jpg", aspect: 1.33 },
  { src: "/images/grad_05.jpg", aspect: 0.56 },
  { src: "/images/grad_06.jpg", aspect: 0.67 },
  { src: "/images/grad_07.jpg", aspect: 1.33 },
  { src: "/images/grad_08.jpg", aspect: 0.75 },
  { src: "/images/grad_09.jpg", aspect: 1.33 },
  { src: "/images/grad_10.jpg", aspect: 0.67 },
  { src: "/images/grad_11.jpg", aspect: 0.67 },
  { src: "/images/grad_12.jpg", aspect: 1.33 },
  { src: "/images/grad_13.jpg", aspect: 0.56 },
  { src: "/images/grad_14.jpg", aspect: 0.67 },
  { src: "/images/grad_15.jpg", aspect: 0.75 },
  { src: "/images/grad_16.jpg", aspect: 1.33 },
  { src: "/images/grad_17.jpg", aspect: 0.67 },
  { src: "/images/grad_18.jpg", aspect: 1.33 },
  { src: "/images/grad_19.jpg", aspect: 0.56 },
  { src: "/images/grad_20.jpg", aspect: 0.75 },
];

const BATCH_SIZE = 20;

function getShuffledBatch(count: number, offset: number, exclude: Set<string> = new Set()) {
  const available = ALL_IMAGES.filter((img) => !exclude.has(img.src));
  // Recycle all images if we need more than what's unique
  const rounds = Math.ceil(count / ALL_IMAGES.length);
  const pool = Array.from({ length: rounds }, () => [...ALL_IMAGES]).flat();
  const filtered = available.length >= count ? available : pool;
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((img, i) => ({
    ...img,
    uniqueKey: `${img.src}-${offset + i}-${Date.now()}`,
  }));
}

interface ImageItem {
  src: string;
  aspect: number;
  uniqueKey: string;
}

export default function App() {
  const [images, setImages] = useState<ImageItem[]>(() =>
    getShuffledBatch(120, 0)
  );
  const [loading, setLoading] = useState(false);
  const [heroExited, setHeroExited] = useState(false);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const loadedCountRef = useRef(120);
  const loadTriggerRef = useRef<ScrollTrigger | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Hero overlay scroll animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scrollSentinelRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
          onLeave: () => setHeroExited(true),
          onEnterBack: () => setHeroExited(false),
        },
      });

      // EXIT phase (50% - 100%): overlay fades away
      tl.fromTo(
        overlayRef.current,
        { opacity: 1 },
        { opacity: 0, ease: "none" },
        0.5
      );

      tl.fromTo(
        nameRef.current,
        { opacity: 1, y: 0 },
        { opacity: 0, y: "-8vh", ease: "none" },
        0.5
      );

      tl.fromTo(
        ruleRef.current,
        { opacity: 0.15, scaleX: 1 },
        { opacity: 0, scaleX: 0.5, ease: "none" },
        0.5
      );

      tl.fromTo(
        scrollHintRef.current,
        { opacity: 0.6 },
        { opacity: 0, ease: "none" },
        0.5
      );
    });

    return () => ctx.revert();
  }, []);

  // Infinite scroll - load more images
  const loadMoreImages = useCallback(() => {
    if (loading) return;
    setLoading(true);

    setTimeout(() => {
      const usedSrcs = new Set(images.map((img) => img.src));
      const newBatch = getShuffledBatch(BATCH_SIZE, loadedCountRef.current, usedSrcs);
      loadedCountRef.current += BATCH_SIZE;
      setImages((prev) => [...prev, ...newBatch]);
      setLoading(false);
    }, 300);
  }, [loading, images]);

  // Create persistent IntersectionObserver for scroll fade
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            gsap.to(el, { opacity: 1, duration: 0.55, ease: 'power1.out', overwrite: true });
          } else if (entry.boundingClientRect.top > 0) {
            // exiting bottom of viewport (user scrolling up) → fade out
            gsap.to(el, { opacity: 0, duration: 0.35, ease: 'power1.in', overwrite: true });
          }
          // exiting top of viewport (user scrolling down) → do nothing, stay visible
        });
      },
      { threshold: 0 }
    );
    return () => observerRef.current?.disconnect();
  }, []);

  // Observe all cards — safe to call on already-observed elements (no-op)
  useEffect(() => {
    if (!observerRef.current) return;
    document.querySelectorAll<HTMLElement>('.grid-image-card').forEach((card) => {
      observerRef.current!.observe(card);
    });
  }, [images.length]);

  // Set up infinite scroll trigger
  useEffect(() => {
    if (loadTriggerRef.current) {
      loadTriggerRef.current.kill();
    }

    const ctx = gsap.context(() => {
      loadTriggerRef.current = ScrollTrigger.create({
        trigger: gridContainerRef.current,
        start: "bottom bottom-=800",
        onEnter: loadMoreImages,
      });
    });

    return () => ctx.revert();
  }, [images.length, loadMoreImages]);


  const breakpointColumns = {
    default: 5,
    1279: 4,
    767: 3,
    479: 2,
  };

  return (
    <div style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Persistent Navigation - appears after hero exit */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 32px",
          transition: "opacity 0.5s ease",
          opacity: heroExited ? 1 : 0,
          pointerEvents: heroExited ? "auto" : "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "22px",
            fontWeight: 400,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Fitria<span style={{ color: "var(--accent)" }}>.</span>
        </div>
        <div
          style={{
            display: "flex",
            gap: "28px",
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: "var(--text-secondary)",
          }}
        >
          {["Work", "About", "Contact"].map((item) => (
            <a
              key={item}
              href="#"
              style={{
                textDecoration: "none",
                color: "inherit",
                transition: "color 0.3s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
            >
              {item}
            </a>
          ))}
        </div>
      </nav>

      {/* Hero overlay — fixed, fades as user scrolls through sentinel */}
      <div
        ref={overlayRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "100vh",
          backgroundColor: "rgba(245, 242, 236, 0.82)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div
          ref={nameRef}
          style={{ position: "relative", display: "inline-block", userSelect: "none" }}
        >
          <h1
            style={{
              fontFamily: "'WindSong', cursive",
              fontSize: "clamp(80px, 14vw, 200px)",
              fontWeight: 400,
              lineHeight: 0.9,
              letterSpacing: "0.01em",
              color: "var(--text-primary)",
              margin: 0,
              textAlign: "center",
            }}
          >
            Fitria
          </h1>
          <span
            style={{
              position: "absolute",
              right: "-8px",
              bottom: "-22px",
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(9px, 0.85vw, 12px)",
              fontWeight: 300,
              letterSpacing: "0.28em",
              textTransform: "uppercase" as const,
              color: "var(--text-secondary)",
              whiteSpace: "nowrap",
            }}
          >
            photography
          </span>
        </div>
        <div
          ref={ruleRef}
          style={{
            width: "120px",
            height: "1px",
            backgroundColor: "var(--text-primary)",
            opacity: 0.15,
            marginTop: "32px",
          }}
        />
        <div
          ref={scrollHintRef}
          style={{
            position: "absolute",
            bottom: "36px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            opacity: 0.6,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase" as const,
              color: "var(--text-secondary)",
            }}
          >
            Scroll
          </span>
          <svg
            className="scroll-indicator-chevron"
            width="14"
            height="9"
            viewBox="0 0 14 9"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L7 7L13 1"
              stroke="var(--text-secondary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Sentinel — 100vh of scroll space for the hero fade animation */}
      <div ref={scrollSentinelRef} style={{ height: "100vh" }} />

      {/* Continuous grid — pulled up to y=0 so it sits behind the hero overlay */}
      <section ref={gridContainerRef} style={{ padding: "8px", marginTop: "-100vh" }}>
        <Masonry
          breakpointCols={breakpointColumns}
          className="masonry-grid"
          columnClassName="masonry-grid-column"
        >
          {images.map((img) => (
            <div
              key={img.uniqueKey}
              className="image-card grid-image-card"
            >
              <img
                src={img.src}
                alt="Graduation photography"
                loading="lazy"
                decoding="async"
                style={{
                  width: "100%",
                  display: "block",
                }}
              />
            </div>
          ))}
        </Masonry>

        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "48px 0",
            }}
          >
            <div className="loading-spinner" />
          </div>
        )}
      </section>
    </div>
  );
}
