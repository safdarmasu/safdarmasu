const mongoose = require('mongoose');
const { Schema } = mongoose;

// =========================================================================
// CUSTOMER SCHEMA
// =========================================================================
const CustomerSchema = new Schema({
  first_name: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  last_name: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null/undefined values
    lowercase: true,
    trim: true
  },
  dob: {
    type: Date // Date of Birth for age-based lens calculations
  }
}, {
  timestamps: true // Automatically generates createdAt and updatedAt fields
});

// Compound index for quick searches on name
CustomerSchema.index({ last_name: 1, first_name: 1 });

// =========================================================================
// JOB ORDER SCHEMA
// =========================================================================
const JobOrderSchema = new Schema({
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID link is required'],
    index: true
  },
  order_number: {
    type: String,
    required: [true, 'Order number is required'],
    unique: true,
    trim: true,
    index: true
  },
  order_status: {
    type: String,
    enum: {
      values: ['Placed', 'In_Lab', 'Ready_For_Pickup', 'Completed'],
      message: '{VALUE} is not a valid order status'
    },
    default: 'Placed',
    index: true
  },
  
  // 4-box prescription matrix
  prescription: {
    right_eye: {
      sph: { type: Number, default: 0.00 },
      cyl: { type: Number, default: 0.00 },
      axis: { 
        type: Number, 
        min: [0, 'Axis must be between 0 and 180 degrees'], 
        max: [180, 'Axis must be between 0 and 180 degrees'],
        default: 0
      },
      add: { type: Number, default: 0.00 }
    },
    left_eye: {
      sph: { type: Number, default: 0.00 },
      cyl: { type: Number, default: 0.00 },
      axis: { 
        type: Number, 
        min: [0, 'Axis must be between 0 and 180 degrees'], 
        max: [180, 'Axis must be between 0 and 180 degrees'],
        default: 0
      },
      add: { type: Number, default: 0.00 }
    }
  },

  // Optical Specifications
  lens_type: {
    type: String,
    trim: true
  },
  frame_details: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },

  // Strict Split-Payment System
  payment: {
    total_amount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    advance_paid: {
      type: Number,
      default: 0.00,
      min: [0, 'Advance paid cannot be negative']
    },
    balance_due: {
      type: Number,
      required: true,
      default: 0.00
    }
  }
}, {
  timestamps: true
});

// Pre-validation hook to ensure strict split-payment business logic
JobOrderSchema.pre('validate', function(next) {
  const payment = this.payment;

  // Validate that advance payment does not exceed total amount
  if (payment.advance_paid > payment.total_amount) {
    this.invalidate('payment.advance_paid', 'Advance paid cannot exceed total amount');
  }

  // Enforce calculation: balance_due = total_amount - advance_paid
  payment.balance_due = parseFloat((payment.total_amount - payment.advance_paid).toFixed(2));
  
  next();
});

// Index for query performance by creation date
JobOrderSchema.index({ createdAt: -1 });

const Customer = mongoose.model('Customer', CustomerSchema);
const JobOrder = mongoose.model('JobOrder', JobOrderSchema);

module.exports = {
  Customer,
  JobOrder
};
