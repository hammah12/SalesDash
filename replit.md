# Replit Project Guide

## Overview

This is a full-stack web application built with React and Express that creates a data visualization dashboard for business metrics. The application fetches data from Google Sheets using CSV parsing and displays interactive charts and analytics using Recharts. The dashboard focuses on sales metrics, conversion rates, talk time analytics, and lead management data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: Shadcn/ui components built on Radix UI primitives for consistent, accessible design
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Recharts library for interactive data visualizations including line charts and analytics
- **Data Processing**: Papa Parse for CSV parsing from Google Sheets

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL store using connect-pg-simple
- **Development**: TSX for TypeScript execution and hot reloading

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect for schema management and migrations
- **Schema**: Simple user authentication system with username/password fields
- **Migrations**: Drizzle Kit for database schema versioning and deployment

### Authentication & Storage
- **In-Memory Storage**: Custom memory storage implementation with user management interface
- **Session-based Authentication**: Express sessions for user state persistence
- **Database Integration**: Ready for PostgreSQL with Drizzle ORM configuration

### Development Environment
- **Build System**: Vite for frontend bundling with React plugin
- **TypeScript**: Strict configuration with path mapping for clean imports
- **Development Tools**: Runtime error overlay and cartographer plugin for Replit integration
- **Code Quality**: ESBuild for production bundling with external package handling

## External Dependencies

### Database & Cloud Services
- **Neon Database**: Serverless PostgreSQL hosting (@neondatabase/serverless)
- **Google Sheets**: CSV data source integration via public sheet URLs

### UI & Visualization Libraries
- **Radix UI**: Complete set of unstyled, accessible UI primitives
- **Recharts**: React charting library for data visualization
- **Lucide React**: Icon library for consistent iconography
- **Date-fns**: Date manipulation and formatting utilities

### Development & Build Tools
- **Vite**: Frontend build tool with React and TypeScript support
- **Drizzle Kit**: Database migration and schema management
- **Papa Parse**: CSV parsing library for Google Sheets integration
- **TanStack Query**: Powerful data synchronization for React

### Form & Validation
- **React Hook Form**: Performant forms with minimal re-renders
- **Zod**: TypeScript-first schema validation
- **Hookform Resolvers**: Integration between React Hook Form and Zod

### Styling & Theming
- **Tailwind CSS**: Utility-first CSS framework
- **Class Variance Authority**: Type-safe component variants
- **CLSX & Tailwind Merge**: Conditional class name utilities