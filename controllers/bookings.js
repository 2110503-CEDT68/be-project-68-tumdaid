const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");

exports.getBookings = async (req, res, next) => {
  let query;

  if (req.user.role !== "admin") {
    query = Booking.find({ user: req.user.id }).populate({
        path:'hotel',
        select:'name province tel'
    });
  } else {
    if(req.params.hotelId){
        console.log(req.params.hotelId);
        query=Booking.find({hotel:req.params.hotelId});
    }else{
        query = Booking.find().populate({
        path:'hotel',
        select:'name province tel'
    });
    }
    
  }
  try {
    const booking = await query;

    res.status(200).json({
      success: true,
      count: booking.length,
      data: booking,
    });
  } catch (err) {
    console.log(err.stack);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Booking" });
  }
};

exports.getBooking = async (req,res,next) =>{
    try {
        const booking = await Booking.findById(req.params.id).populate({
        path:'hotel',
        select:'name province tel'
    });

    if(!booking){
        return res.status(404).json({success:false,message:`No booking with the id of ${req.params.id}`});

    }
    if (
      booking.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this booking"
      });
    }

    res.status(200).json({
        success:true,
        data:booking
    })

    } catch(error){
            console.log(error);
            return res.status(500).json({success:false,message:"Cannot find Booking"});

    }
    
};

exports.addBooking = async (req, res, next) => {
  try {
    req.body.hotel = req.params.hotelId;

    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: `No hotel with the id of ${req.params.hotelId}`,
      });
    }

    req.body.user = req.user.id;

    const { checkInDate, checkOutDate } = req.body;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide checkInDate and checkOutDate",
      });
    }

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);

    const checkIn = new Date(inDate.getFullYear(), inDate.getMonth(), inDate.getDate());
    const checkOut = new Date(outDate.getFullYear(), outDate.getMonth(), outDate.getDate());

    // validate date
    if (isNaN(checkIn) || isNaN(checkOut)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        message: "checkOutDate must be after checkInDate",
      });
    }

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const days = (checkOut - checkIn) / MS_PER_DAY;

    // max 3 days
    if (req.user.role !== "admin" && days > 3) {
      return res.status(400).json({
        success: false,
        message: "Booking cannot exceed 3 days",
      });
    }

    const booking = await Booking.create(req.body);

    return res.status(200).json({
      success: true,
      data: booking,
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Cannot create booking",
    });
  }
};

exports.updateBooking= async (req,res, next)=>{
        try{
            let booking = await Booking.findById(req.params.id);

            if(!booking){
                return res.status(404).json({success:false, message:`No booking with the id of ${req.params.id}`});

            }

            if(booking.user.toString()!==req.user.id && req.user.role !== 'admin'){
                return res.status(401).json({success:false,message:`User ${req.user.id} is not authorized to update this booking`});

            }

            booking=await Booking.findByIdAndUpdate(req.params.id,req.body,{
                new:true,
                runValidators:true
            });
            res.status(200).json({
                success:true,
                data: booking
            });
        }catch(error){
            console.log(error);
            return res.status(500).json({success:false, message:"Cannot update Booking"});

        }
    }

exports.deleteBooking= async (req,res, next)=>{
        try{
            let booking = await Booking.findById(req.params.id);

            if(!booking){
                return res.status(404).json({success:false, message:`No booking with the id of ${req.params.id}`});

            }
               if(booking.user.toString()!==req.user.id && req.user.role !== 'admin'){
                return res.status(401).json({success:false,message:`User ${req.user.id} is not authorized to delete this booking`});

            }
            await booking.deleteOne();
            res.status(200).json({
                success:true,
                data: {}
            });
        }catch(error){
            console.log(error);
            return res.status(500).json({success:false, message:"Cannot delete Booking"});

        }
    }




