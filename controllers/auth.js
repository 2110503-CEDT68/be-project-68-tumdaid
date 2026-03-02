const User = require("../models/User");

// small helpers (manual validation)
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

const normalizeEmail = (email) => email.trim().toLowerCase();

//@desc   Register user
//@route  POST /api/v1/auth/register
//@access Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // ✅ Manual validation (BEFORE DB)
    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        success: false,
        msg: "name, email, and password are required",
      });
    }

    if (name.length > 60 || email.length > 100 || password.length > 100) {
      return res.status(400).json({ success: false, msg: "Input too long" });
    }

    // simple email format check (manual)
    const emailNorm = normalizeEmail(email);
    if (!emailNorm.includes("@") || !emailNorm.includes(".")) {
      return res.status(400).json({ success: false, msg: "Invalid email format" });
    }

    // ✅ Role whitelist (adjust to your app)
    const allowedRoles = ["user", "admin"];
    const safeRole = role && typeof role === "string" ? role : "user";
    if (!allowedRoles.includes(safeRole)) {
      return res.status(400).json({ success: false, msg: "Invalid role" });
    }

    //Create user
    const user = await User.create({
      name: name.trim(),
      email: emailNorm,
      password,
      role: safeRole,
    });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false });
    console.log(err.stack);
  }
};

//@desc   Login user
//@route  POST /api/v1/auth/login
//@access Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ✅ Manual validation (BEFORE DB)
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, msg: "Please provide an email and password" });
    }

    // Type checks stop NoSQL injection payloads like: { email: { $gt: "" } }
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, msg: "Invalid input type" });
    }

    if (email.length > 100 || password.length > 100) {
      return res.status(400).json({ success: false, msg: "Input too long" });
    }

    const emailNorm = normalizeEmail(email);

    //Check for user
    const user = await User.findOne({ email: emailNorm }).select("+password");
    if (!user) {
      // Usually 401 is better than 400 for bad credentials
      return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }

    //Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    // This message is misleading; only return generic error
    console.log(err.stack);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

//Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: "lax", // ✅ good default
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res.status(statusCode).cookie("token", token, options).json({ success: true, token });
};

//@desc Get current Logged in user
//@route GET /api/v1/auth/me
//@access Private
exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id).select("-password");
  res.status(200).json({ success: true, data: user });
};

//@desc Log user out / clear cookie
//@route GET /api/v1/auth/logout
//@access Private
exports.logout = async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ success: true, data: {} });
};