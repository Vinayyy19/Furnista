const userModel = require("../models/user.model");

module.exports.createUser = async ({ name, email, password, phoneNumber, address }) => {
  if (!name || !email || !password || !phoneNumber) {
    throw new Error("Required fields missing");
  }

  return await userModel.create({
    name,
    email,
    password,
    phoneNumber,
    address: address || {},
  });
};

module.exports.getUserById = async (userId) => {
  return await userModel.findById(userId);
};

module.exports.getUserByEmail = async (email) => {
  return await userModel.findOne({ email });
};

module.exports.updateUserProfile = async (userId, { name, phoneNumber }) => {
  const user = await userModel.findById(userId);
  if (!user) throw new Error("User not found");

  if (name) {
    user.name = { ...user.name, ...name };
  }

  if (phoneNumber) {
    user.phoneNumber = phoneNumber;
  }

  await user.save();
  return user;
};

module.exports.updateUserAddress = async (userId, address) => {
  const user = await userModel.findById(userId);
  if (!user) throw new Error("User not found");

  user.address = { ...user.address, ...address };

  await user.save();
  return user;
};
