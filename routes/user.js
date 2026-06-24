const express = require('express');
const router = express.Router();
const upload = require('../utils/multer')

const { registerUser,
    loginUser,
    updateUser,
    deactivateUser,
    sendToken

} = require('../controllers/user')
const { isAuthenticatedUser } = require('../middlewares/auth')

router.post('/register', upload.single('image'), registerUser)
router.post('/login', loginUser)
router.post('/send-token', sendToken)
router.post('/update-profile', isAuthenticatedUser, upload.single('image'), updateUser)
router.delete('/deactivate', deactivateUser)
module.exports = router