const express=require('express');

const
{register, login, getMe, logout,updateUser,deleteUser,updatePassword}=require('../controllers/auth');

const router =express.Router({ mergeParams: true });

const {protect,authorize} = require('../middleware/auth');

router.post('/register',register);
router.post('/login',login);
router.get('/me',protect,getMe);
router.get('/logout',logout);
router.route('/:id').put(protect, authorize('admin','user'),updateUser)
                    .delete(protect, authorize('admin','user'),deleteUser);
router.put("/:id/password", protect, authorize("admin", "user"), updatePassword);

module.exports=router;