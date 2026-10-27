import Image from "next/image";

export function BrandLogo({ variant = "wordmark", className = "" }: { variant?: "wordmark" | "full"; className?: string }) {
  if (variant === "full") {
    return <Image className={className} src="/brand/la-nueve.webp" width={1402} height={1122} alt="LA NUEVE · Que hable lo que hacemos. Trinidad, Flores." priority />;
  }
  return <Image className={className} src="/brand/la-nueve-lockup.webp" width={1250} height={490} alt="LA NUEVE · Que hable lo que hacemos. Trinidad, Flores." priority />;
}
