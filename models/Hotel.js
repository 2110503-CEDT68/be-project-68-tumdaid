const mongoose = require('mongoose');

const HotelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,'Please add a name'],
        unique: true,
        trim:true,
        maxlength:[50,'Name can not be more than 50 characters']
    },
    address:{
        type: String,
        required: [true, 'Please add an address']
        },
    district:{
        type: String,
        required: [true, 'Please add a district']
    },
    province:{
        type: String,
        required: [true, 'Please add a province']
    },
    postalcode:{
        type: String,
        required: [true, 'Please add a postalcode'], 
        maxlength:[5, 'Postal Code can not be more than 5 digits']
    },
    region:{
        type: String,
        required: [true, 'Please add a region']
    },
    tel: {
      type: String,
      required: [true, "Please add a telephone number"],
      trim: true,
      match: [
        /^\d{3}-\d{3}-\d{4}$/,
        'Telephone number format must be "xxx-xxx-xxxx" (e.g. 012-345-6789)',
      ],
    },
},
    {
        toJSON: {virtuals:true},
        toObject:{virtuals:true}
    
});

HotelSchema.virtual('bookings',{
    ref:'Booking',
    localField:'_id',
    foreignField:'hotel',
    justOne:false
})

module.exports=mongoose.model('Hotel',HotelSchema);