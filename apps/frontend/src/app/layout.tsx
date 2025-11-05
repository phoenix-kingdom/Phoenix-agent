export const metadata = {
  title: 'Chat PDF with LangGraph',
  description: 'AI chatbot for PDFs using LangGraph/LangChain'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}


