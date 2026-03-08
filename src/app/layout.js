export const metadata = {
  title: "System Turniejowy",
  description: "Aplikacja do zarządzania turniejem siatkówki",
};
<meta name="robots" content="noindex,nofollow" />;

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="bg-gray-100 text-gray-900">{children}</body>
    </html>
  );
}
