-- Institutions
CREATE TABLE institutions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs
CREATE TABLE programs (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER REFERENCES institutions(id),
  name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true
);

-- Laptop Catalog (managed by OpenBox)
CREATE TABLE laptops (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  specs TEXT,
  price_cad NUMERIC(8,2) NOT NULL,
  image_url TEXT,
  stock_available INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim Tokens (one per enrolled student)
CREATE TABLE claim_tokens (
  id SERIAL PRIMARY KEY,
  token_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  student_email VARCHAR(255) NOT NULL,
  institution_id INTEGER REFERENCES institutions(id),
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claims
CREATE TABLE claims (
  id SERIAL PRIMARY KEY,
  token_id INTEGER REFERENCES claim_tokens(id),
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  student_phone VARCHAR(50),
  student_id_number VARCHAR(100),
  institution_id INTEGER REFERENCES institutions(id),
  program_id INTEGER REFERENCES programs(id),
  laptop_id INTEGER REFERENCES laptops(id),
  status VARCHAR(50) DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','approved','denied','awaiting_shipping','shipped','delivered')),
  finance_notes TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMPTZ,
  shipping_name VARCHAR(255),
  shipping_address_line1 VARCHAR(255),
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_province VARCHAR(50),
  shipping_postal_code VARCHAR(20),
  shipping_phone VARCHAR(50),
  tracking_number VARCHAR(255),
  carrier VARCHAR(100),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Finance + OpenBox + Super Admin)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin','finance','vendor')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
