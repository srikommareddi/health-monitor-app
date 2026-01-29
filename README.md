# Health Monitor App

A patient-facing mobile health application that integrates with Epic EHR systems to help patients track and monitor their vital signs.

## Overview

Health Monitor App enables patients to securely connect to their Epic health records and view their vital signs including blood pressure, heart rate, temperature, and other health metrics in an easy-to-use mobile interface.

## Features

- **Epic EHR Integration**: Connects to Epic health records via FHIR R4 APIs
- **Vital Signs Tracking**: 
  - Blood pressure monitoring
  - Heart rate tracking
  - Temperature readings
  - Weight and BMI
  - Respiratory rate
  - Oxygen saturation
- **Secure Authentication**: OAuth 2.0 with PKCE for secure patient authorization
- **Real-time Data Sync**: Automatic synchronization with Epic health records
- **Patient Dashboard**: Clean, intuitive interface for viewing health trends

## Technology Stack

### Backend
- Node.js with Express
- OAuth 2.0 PKCE implementation
- Epic FHIR R4 API integration
- PostgreSQL for data storage

### Mobile App
- React Native for cross-platform mobile development
- Secure token storage
- Offline data caching

### Integration
- Epic SMART on FHIR
- FHIR R4 resources (Patient, Observation)
- RESTful API architecture

## Epic Integration Status

This application is registered with Epic's open.epic.com developer platform for testing and development with Epic's FHIR sandbox environment.

### Required Scopes
- `patient/Patient.read` - Read patient demographics
- `patient/Observation.read` - Read vital signs and observations
- `launch/patient` - Launch in patient context
- `openid` - OpenID Connect
- `fhirUser` - User identification

## Development Status

🚧 **Currently in Development**

- [x] Backend OAuth PKCE flow implementation
- [x] Epic FHIR API integration
- [x] Vitals data retrieval endpoints
- [ ] Mobile app UI development
- [ ] Production deployment
- [ ] Epic App Orchard submission

## Security & Compliance

- HIPAA-compliant data handling
- Encrypted data transmission (TLS 1.2+)
- Secure token storage
- No PHI stored locally on devices
- Patient consent management

## Getting Started

### Prerequisites
- Node.js 16+
- Epic developer account
- Registered Epic app credentials

### Installation
```bash
# Clone the repository
git clone https://github.com/srikommareddi/health-monitor-app.git

# Install backend dependencies
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Epic credentials

# Start development server
npm run dev
```

## Documentation

- [Epic Integration Setup](docs/EPIC_INTEGRATION_SETUP.md)
- [API Documentation](docs/API.md)
- [Mobile App Setup](docs/MOBILE_SETUP.md)

## License

MIT License

## Contact

For questions or support, please open an issue in this repository.
