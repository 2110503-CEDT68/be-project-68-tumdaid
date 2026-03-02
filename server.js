const { setServers } = require("node:dns/promises");
setServers(["1.1.1.1", "8.8.8.8"]);

const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");

//Load env vars
dotenv.config({ path: "./config/config.env" });
//Connect to database
connectDB();

//Route files
const auth = require("./routes/auth");
const bookings = require("./routes/bookings");
const hotels = require("./routes/hotels");
const mongoSanitize = require("express-mongo-sanitize");
const app = express();
const rateLimit = require("express-rate-limit");
//Body parser
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
// General API limiter (whole API)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                 // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth endpoints (login/register)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,                  // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later." },
});

app.use("/api", apiLimiter);
app.use("/api/v1/auth", authLimiter);

app.use("/api/v1/bookings", bookings);
app.use("/api/v1/hotels", hotels);
app.use("/api/v1/auth", auth);
app.set("query parser", "extended");
const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(
    "Server running in ",
    process.env.NODE_ENV,
    " mode on port ",
    PORT,
  ),
);

//Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  //Close server & exit process
  server.close(() => process.exit(1));
});
