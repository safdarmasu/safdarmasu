-- PostgreSQL Database Schema for OptiSphere (Optical Billing & Rx Manager)

-- Enable UUID extension (for modern, secure, and scalable identifiers)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define order status enum
CREATE TYPE order_status_type AS ENUM (
    'Placed', 
    'In_Lab', 
    'Ready_For_Pickup', 
    'Completed'
);

-- =========================================================================
-- CUSTOMERS TABLE
-- =========================================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL, -- Core contact detail for order updates
    email VARCHAR(100) UNIQUE,
    dob DATE, -- Date of Birth (important for age-based lens calculations like ADD)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast customer search by name or contact
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_name ON customers(last_name, first_name);

-- =========================================================================
-- JOB_ORDERS TABLE
-- =========================================================================
CREATE TABLE job_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_number VARCHAR(30) UNIQUE NOT NULL, -- Human-readable identifier (e.g. OPT-2026-0001)
    order_status order_status_type NOT NULL DEFAULT 'Placed',
    
    -- Eye Prescription Matrix (Right / Left)
    -- SPH (Sphere), CYL (Cylinder), ADD (Addition) use DECIMAL(4, 2)
    -- AXIS uses INT with Check constraint (0 to 180 degrees)
    rx_right_sph DECIMAL(4, 2),
    rx_right_cyl DECIMAL(4, 2),
    rx_right_axis INT CHECK (rx_right_axis BETWEEN 0 AND 180),
    rx_right_add DECIMAL(4, 2),
    
    rx_left_sph DECIMAL(4, 2),
    rx_left_cyl DECIMAL(4, 2),
    rx_left_axis INT CHECK (rx_left_axis BETWEEN 0 AND 180),
    rx_left_add DECIMAL(4, 2),
    
    -- Specifications
    lens_type VARCHAR(50), -- e.g., Single Vision, Bifocal, Progressive, Blue Cut
    frame_details VARCHAR(255),
    notes TEXT,

    -- Strict Split-Payment System (All numeric values scaled to 2 decimal places)
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    advance_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (advance_paid >= 0),
    
    -- Generated Column to enforce strict balance_due integrity at database level
    balance_due DECIMAL(10, 2) GENERATED ALWAYS AS (total_amount - advance_paid) STORED,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Double-check safety constraint: Advance paid must never exceed total amount
    CONSTRAINT chk_advance_limit CHECK (advance_paid <= total_amount)
);

-- Indexing strategies for high-performance retrieval
CREATE INDEX idx_job_orders_customer_id ON job_orders(customer_id);
CREATE INDEX idx_job_orders_status ON job_orders(order_status);
CREATE INDEX idx_job_orders_order_number ON job_orders(order_number);
CREATE INDEX idx_job_orders_created_at ON job_orders(created_at);

-- Trigger to automatically update 'updated_at' column
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_modtime
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

CREATE TRIGGER update_job_orders_modtime
    BEFORE UPDATE ON job_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();
