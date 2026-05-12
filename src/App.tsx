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
  const pool = available.length >= count ? available : ALL_IMAGES;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
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
    getShuffledBatch(20, 0)
  );
  const [loading, setLoading] = useState(false);
  const [heroExited, setHeroExited] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const loadedCountRef = useRef(20);
  const loadTriggerRef = useRef<ScrollTrigger | null>(null);

  // Hero overlay scroll animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "+=100%",
          pin: true,
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

  // Global snap for hero pinned section only
  useEffect(() => {
    const timeout = setTimeout(() => {
      const pinned = ScrollTrigger.getAll()
        .filter((st) => st.vars.pin)
        .sort((a, b) => a.start - b.start);

      const maxScroll = ScrollTrigger.maxScroll(window);
      if (!maxScroll || pinned.length === 0) return;

      const pinnedRanges = pinned.map((st) => ({
        start: st.start / maxScroll,
        end: (st.end ?? st.start) / maxScroll,
        center: (st.start + ((st.end ?? st.start) - st.start) * 0.75) / maxScroll,
      }));

      ScrollTrigger.create({
        snap: {
          snapTo: (value) => {
            const inPinned = pinnedRanges.some(
              (r) => value >= r.start - 0.02 && value <= r.end + 0.02
            );
            if (!inPinned) return value;

            const target = pinnedRanges.reduce(
              (closest, r) =>
                Math.abs(r.center - value) < Math.abs(closest - value)
                  ? r.center
                  : closest,
              pinnedRanges[0]?.center ?? 0
            );
            return target;
          },
          duration: { min: 0.15, max: 0.35 },
          delay: 0,
          ease: "power2.out",
        },
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

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
            fontFamily: "var(--font-display)",
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

      {/* Section 1: Hero Overlay (pinned) */}
      <section
        ref={heroRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Masonry grid visible behind the overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
            zIndex: 1,
          }}
        >
          <div style={{ padding: "16px" }}>
            <Masonry
              breakpointCols={breakpointColumns}
              className="masonry-grid"
              columnClassName="masonry-grid-column"
            >
              {images.slice(0, 25).map((img) => (
                <div key={`hero-${img.uniqueKey}`} className="image-card">
                  <img
                    src={img.src}
                    alt="Graduation photography"
                    loading="eager"
                    decoding="async"
                    style={{
                      width: "100%",
                      display: "block",
                    }}
                  />
                </div>
              ))}
            </Masonry>
          </div>
        </div>

        {/* Overlay that fades on scroll */}
        <div
          ref={overlayRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(245, 242, 236, 0.78)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <h1
            ref={nameRef}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(80px, 14vw, 200px)",
              fontWeight: 300,
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              margin: 0,
              textAlign: "center",
              userSelect: "none",
            }}
          >
            Fitria
          </h1>
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
              bottom: "32px",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "var(--text-secondary)",
              opacity: 0.6,
            }}
          >
            Scroll to explore
          </div>
        </div>
      </section>

      {/* Section 2: Infinite Masonry Grid (flowing) */}
      <section ref={gridContainerRef} style={{ padding: "16px" }}>
        <Masonry
          breakpointCols={breakpointColumns}
          className="masonry-grid"
          columnClassName="masonry-grid-column"
        >
          {images.map((img, index) => (
            <div
              key={img.uniqueKey}
              className="image-card fade-in-up"
              style={{
                animationDelay: `${Math.min(index * 0.03, 0.6)}s`,
                animationFillMode: "both",
              }}
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
