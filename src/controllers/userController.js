const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// user controllers
const userController = {
    //register user
    register: async (req, res) => {
        try {
            //step 1 : take user from req.body
            const { username, email, password } = req.body;
            //step 2 :check if user exists
            const userExist = await User.findOne({ $or: [{ email }, { username }] });
            if (userExist) {
                return res.status(400).json({ error: 'User already exists' });
            }
            //step 3 :if not, hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            //step 4 :create user
            const user = await User.create({ username, email, password: hashedPassword });
            //step 5 :save user
            user.save();
            //step 6 :send response
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
            return res.status(201).json({ message: 'User registered successfully', user, token });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    },
    //login user
    login: async (req, res) => {
        try {
            //step 1 :take user from req.body
            const { email, password } = req.body;
            //step 2 :check if user exists
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }
            //step 3 :compare password
            const isMatch = await bcrypt.compare(password, user.password);
            //step 4 :if not, send error
            if (!isMatch) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }
            //step 5 :send response
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
            return res.status(200).json({ message: 'User logged in successfully', user, token });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
module.exports = userController;