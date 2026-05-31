export const TESTIMONIALS_API_URL = "http://localhost:3000/api/testimoni-done";

// 10 testimoni = ~20 pesan Discord (teks + gambar)
export const TESTIMONIALS_LIMIT = 10;
export const TESTIMONIALS_RAW_LIMIT = 20;

export function buildTestimonialsUrl() {
  const url = new URL(TESTIMONIALS_API_URL);
  url.searchParams.set("limit", String(TESTIMONIALS_RAW_LIMIT));
  return url.toString();
}
