# Direct Reports Tracker

A Next.js application for tracking notes, feedback, and praise for your direct reports from weekly sync meetings. The app runs locally with Docker support and uses a JSON file-based document store for easy import/export.

## Technology Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Data Storage**: JSON file-based document store
- **Runtime**: Node.js 18
- **Containerization**: Docker & Docker Compose

## Prerequisites

### For Local Development
- Node.js 18 or higher
- npm (comes with Node.js)

### For Docker Development
- Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- Docker Compose

## Getting Started

### Local Development Setup

#### Windows
1. Install Node.js from [nodejs.org](https://nodejs.org)
2. Clone the repository:
   ```cmd
   git clone <repository-url>
   cd direct-reports
   ```
3. Install dependencies:
   ```cmd
   npm install
   ```
4. Start the development server:
   ```cmd
   npm run dev
   ```

#### macOS/Linux
1. Install Node.js (recommended via [nvm](https://github.com/nvm-sh/nvm)):
   ```bash
   # Install nvm (if not already installed)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Install and use Node.js 18
   nvm install 18
   nvm use 18
   ```
2. Clone the repository:
   ```bash
   git clone <repository-url>
   cd direct-reports
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Docker Development Setup

#### Windows (Docker Desktop)
1. Install [Docker Desktop for Windows](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe)
2. Clone the repository:
   ```cmd
   git clone <repository-url>
   cd direct-reports
   ```
3. Build and run with Docker Compose:
   ```cmd
   docker-compose up --build
   ```

#### macOS (Docker Desktop)
1. Install [Docker Desktop for Mac](https://desktop.docker.com/mac/main/amd64/Docker.dmg)
2. Clone the repository:
   ```bash
   git clone <repository-url>
   cd direct-reports
   ```
3. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

#### Linux (Docker Engine)
1. Install Docker Engine:
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install docker.io docker-compose
   
   # CentOS/RHEL/Fedora
   sudo dnf install docker docker-compose
   ```
2. Start Docker service:
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```
3. Clone the repository:
   ```bash
   git clone <repository-url>
   cd direct-reports
   ```
4. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

## Available Scripts

### Local Development
```bash
# Install dependencies
npm install

# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check (via build process)
npm run build
```

### Docker Commands
```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose build --no-cache
```

## Accessing the Application

Once running, open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Data Persistence

- **Local Development**: Data is stored in the `data/` directory
- **Docker**: Data is persisted via Docker volumes, ensuring it survives container restarts
- **File Structure**: 
  - `data/employees.json` - Employee data
  - `data/resources/` - Supporting documents

## Troubleshooting

### Common Issues

#### Port Already in Use
If port 3000 is already in use:
- **Local**: The dev server will automatically try the next available port
- **Docker**: Stop other containers using port 3000 or modify `docker-compose.yml`

#### Permission Issues (Linux)
If you encounter permission issues with Docker:
```bash
# Add your user to the docker group
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

#### Windows Docker Issues
- Ensure virtualization is enabled in BIOS
- Make sure Docker Desktop is running
- Try restarting Docker Desktop if containers won't start

### Getting Help

If you encounter issues:
1. Check the application logs
2. Ensure all prerequisites are installed
3. Try rebuilding containers: `docker-compose build --no-cache`
4. Check Docker/Node.js versions match requirements

## Development Notes

- The app uses client-side routing for seamless navigation
- All forms include proper validation and error handling
- The database layer abstracts file operations and provides type safety
- Hot reloading is enabled in development mode
- Data persists between restarts in both local and Docker setups