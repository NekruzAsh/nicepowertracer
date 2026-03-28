 const express = require("express");

 const app = express();
 app.use(express.json());


 app.post("/api/arduino", (req, res) => {
   const { id, current } = req.body;

   if (id === undefined || current === undefined)
     return res.status(400).json({ error: "Missing id or current" });
   
   const currentNum = parseFloat(current);
  if (isNaN(currentNum) || currentNum < 0)
    return res.status(400).json({ error: "current must be a non-negative number" });

     console.log(`Device ${id} → ${currentNum} A`);


   // TODO: persist to DB, emit via WebSocket, etc.
   
   res.json({ status: "ok", received: { id, current } });
 });

 app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Listening on :${PORT}`));