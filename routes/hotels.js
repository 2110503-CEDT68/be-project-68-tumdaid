const express = require('express');
const {getHotels,getHotel,createHotel,updateHotel,deleteHotel} = require('../controllers/hospitals')

//Include other resource routers
const bookingRoute=require('./bookings');

const router = express.Router();
const {protect,authorize} = require('../middleware/auth');
 //Re-roter into other resource routers
 router.use('/:hospitalId/bookings',bookingRoute);

router.route('/').get(getHotels).post(protect,authorize('admin'),createHotel);
router.route('/:id').get(getHotel).put(protect,authorize('admin'),updateHotel).delete(protect,authorize('admin'),deleteHotel);

module.exports = router;