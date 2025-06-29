# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Employee Notes Tracker - A Next.js application for tracking notes, feedback, and praise from weekly employee sync meetings. The app runs locally in Docker and uses a JSON file-based document store for easy import/export.

## Technology Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Data Storage**: JSON file-based document store
- **Runtime**: Node.js 18
- **Containerization**: Docker & Docker Compose

## Development Commands

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

# Type check
npm run type-check
```

## Docker Commands

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f
```

## Architecture

### Data Model
- **Employee**: Core entity with UUID, name, start date, and collections of notes/praise/feedback
- **Collections**: Each employee has three arrays for notes, praise, and feedback with timestamps
- **Storage**: JSON file at `data/employees.json` with automatic backup/restore capability

### API Routes
- `GET/POST /api/employees` - List and create employees
- `GET /api/employees/[id]` - Get specific employee
- `POST /api/employees/[id]/notes` - Add notes
- `POST /api/employees/[id]/praise` - Add praise
- `POST /api/employees/[id]/feedback` - Add feedback

### Key Files
- `src/types/employee.ts` - TypeScript interfaces
- `src/lib/database.ts` - JSON file database operations
- `src/app/employees/[id]/page.tsx` - Employee detail view with tabbed interface
- `src/app/employees/new/page.tsx` - Employee creation form

### Data Persistence
- JSON files stored in `data/` directory
- Volume mounted in Docker for persistence
- Automatic directory creation and file initialization

## Development Notes

- The app uses client-side routing for seamless navigation
- All forms include proper validation and error handling
- The database layer abstracts file operations and provides type safety
- Docker setup includes volume mounting for data persistence