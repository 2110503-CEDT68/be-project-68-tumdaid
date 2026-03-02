const User = require("../models/User");
const Booking = require("../models/Booking");

// small helpers (manual validation)
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

const normalizeEmail = (email) => email.trim().toLowerCase();

//@desc   Register user
//@route  POST /api/v1/auth/register
//@access Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, tel } = req.body;

    // Manual validation 
    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(tel)) {
      return res.status(400).json({
        success: false,
        msg: "name, email, password, and tel are required",
      });
    }

    if (name.length > 60 || email.length > 100 || password.length > 100) {
      return res.status(400).json({ success: false, msg: "Input too long" });
    }

    // simple email format check 
    const emailNorm = normalizeEmail(email);

    // Role whitelist 
    const allowedRoles = ["user", "admin"];
    const safeRole = role && typeof role === "string" ? role : "user";

    const user = await User.create({
      name: name.trim(),
      email: emailNorm,
      password,
      role: safeRole,
      tel: tel.trim(), 
    });

    sendTokenResponse(user, 200, res);

  } catch (err) {
    console.log(err.stack);
    res.status(400).json({ success: false });
  }
};

//@desc   Login user
//@route  POST /api/v1/auth/login
//@access Public
exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        msg: "Please provide tel/email and password"
      });
    } 

    if (typeof identifier !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        msg: "Invalid input type"
      });
    }

    let query = {};

    // detect email
    if (identifier.includes("@")) {
      const emailNorm = normalizeEmail(identifier);
      query.email = identifier;
    } else {
      query.tel = identifier;
    }

    const user = await User.findOne(query).select("+password");

    if (!user) {
      return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        msg: "Invalid credentials"
      });
    }

    sendTokenResponse(user, 200, res);

  } catch (err) {
    console.log(err.stack);
    return res.status(500).json({ success: false, msg: "Server error cannot login" });
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
    sameSite: "lax", 
    
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

//@update user
//@route PUT /api/v1/auth/:id
//@access Private
exports.updateUser = async (req, res, next) => {
  try {
    // 1) user can update only themselves; admin can update anyone
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized to update this user"
      });
    }

    // 2) whitelist fields (prevent role escalation, reset token edits, etc.)
    const allowedFields = ["name", "email", "tel"]; 
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // Optional: block role updates even for admin (remove if you want admin to change role)
    if (req.body.role !== undefined) {
      return res.status(400).json({
        success: false,
        msg: "Role cannot be updated here"
      });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found"});
    }

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    // handle duplicate key (email/tel unique)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        msg: "Email or tel already exists"
      });
    }

    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, msg: "Please provide newPassword" });
    }

    if (typeof newPassword !== "string") {
      return res.status(400).json({ success: false, msg: "Invalid input type" });
    }

    // Authorization: user only self; admin any
    const isAdmin = req.user.role === "admin";
    const isSelf = req.user.id === req.params.id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    // Load user with password
    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // If normal user, require currentPassword
    if (!isAdmin) {
      if (!currentPassword || typeof currentPassword !== "string") {
        return res.status(400).json({ success: false, msg: "Please provide currentPassword" });
      }

      const match = await user.matchPassword(currentPassword);
      if (!match) {
        return res.status(401).json({ success: false, msg: "Current password is incorrect" });
      }
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, msg: "Password updated" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

//delete user
//route : delete /api/v1/auth/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "admin";
    const isSelf = req.user.id === req.params.id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized to delete this user"
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: `User not found with id ${req.params.id}`
      });
    }

    await Booking.deleteMany({ user: req.params.id });

    await User.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      msg: "Server error"
    });
  }
};