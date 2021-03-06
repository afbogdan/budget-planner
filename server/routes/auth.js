const express = require("express");
const router = express.Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const authSchemas = require("./schemas/authSchemas");

router.post("/register", async (req, res) => {
  try {
    await authSchemas.registerInput.validateAsync(req.body);

    // check if user exists
    await User.canCreateUser(req.body.username);

    // if not, create user
    const newUser = await User.create(req.body);
    if (!newUser) {
      return res.status(500).json({ message: "Failed to create user" });
    }

    const token = jwt.sign(
      JSON.stringify({ username: newUser.username, id: newUser.id }),
      process.env.JWT_SECRET
    );
    newUser.token = token;

    await authSchemas.registerOutput.validateAsync(newUser);

    res.status(201).json(newUser);
  } catch (err) {
    // if exists, throw an error
    console.log(err);
    res.status(err.status || 409).json(err);
  }
});

router.post("/login", async (req, res) => {
  try {
    await authSchemas.loginInput.validateAsync(req.body);

    const user = await User.readByUsername(req.body.username);
    await User.matchPassword(req.body);

    const token = jwt.sign(
      JSON.stringify({ username: user.username, id: user.id }),
      process.env.JWT_SECRET
    );
    user.token = token;

    await authSchemas.loginOutput.validateAsync(user);
    res.json(user);

  } catch (err) {
    res.status(err.status || 400).json(err);
  }
});

module.exports = router;
