import { z } from "zod";
import { createApp } from "./app.js";

const port = z
  .string()
  .regex(/^\d+$/, "PORT must be a whole number.")
  .pipe(z.coerce.number<string>().int().min(1).max(65535))
  .parse(process.env.PORT ?? "3001");

const server = createApp().listen(port, "127.0.0.1", () => {
  console.info(`Catalogue service listening at http://127.0.0.1:${port}`);
});

server.on("error", (error) => {
  console.error("catalogue_start_failed", error);
  process.exitCode = 1;
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close((error) => {
      if (error) {
        console.error("catalogue_shutdown_failed", error);
        process.exitCode = 1;
      }
    });
    server.closeIdleConnections();
  });
}
