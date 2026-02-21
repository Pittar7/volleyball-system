export const metadata = {
  title: "System Turniejowy",
  description: "Aplikacja do zarządzania turniejem siatkówki",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="bg-gray-100 text-gray-900">{children}</body>
    </html>
  );
}
