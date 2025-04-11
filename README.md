# CBOE PITCH Data Processor

A full-stack web application for processing CBOE PITCH data files. This application allows users to upload PITCH data files, processes them according to the PITCH specification, and displays detailed analytics including message type counts, symbol statistics, and visual representations of the data.

## Architecture

- **Backend**: Django REST Framework with PostgreSQL database
- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Containerization**: Docker and Docker Compose
- **Authentication**: JWT-based authentication system
- **API Documentation**: Swagger UI / ReDoc

## Features

- File upload interface for CBOE PITCH data files
- Server-side processing of PITCH data according to specification
- Interactive dashboard with statistics and visualizations
- Detailed analysis of message types and symbols
- User authentication and profile management
- File history and management
- Responsive user interface designed with CBOE branding
- API documentation with Swagger

## Installation and Setup with Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10.0 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0.0 or higher)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/cboe-pitch-processor.git
cd cboe-pitch-processor
```

### Step 2: Environment Setup

Create environment files for both backend and frontend:

**For Backend (.env.backend)**:

```bash
# Create the backend environment file
cat > .env.backend << EOL
DEBUG=True
SECRET_KEY=your_secret_key_here
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
DATABASE_URL=postgres://postgres:postgres@db:5432/cboe
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=your_email@gmail.com
EOL
```

**For Frontend (.env.local)**:

```bash
# Create the frontend environment file
cat > frontend/.env.local << EOL
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOL
```

### Step 3: Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

This command builds and starts the following services:
- PostgreSQL database (`db`)
- Django backend service (`backend`)
- Next.js frontend service (`frontend`)

### Step 4: Initialize the Database

Run migrations to set up the database schema:

```bash
docker-compose exec backend python manage.py migrate
```

### Step 5: Create a Superuser (Optional)

Create an admin user to access the Django admin interface:

```bash
docker-compose exec backend python manage.py createsuperuser
```

### Step 6: Access the Application

- Frontend application: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000/api/](http://localhost:8000/api/)
- Admin interface: [http://localhost:8000/admin/](http://localhost:8000/admin/)
- API documentation: [http://localhost:8000/swagger/](http://localhost:8000/swagger/)

## Docker Compose Configuration

The application is containerized using Docker with the following services defined in `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"
    environment:
      - DEBUG=1
    restart: always
    networks:
      - cboe-net

  frontend:
    build: ./frontend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://backend:8000
    restart: always
    networks:
      - cboe-net

networks:
  cboe-net:
    driver: bridge
```

### Backend Service
- Built from the `./backend` directory
- Development mode with volume mapping for code changes
- Exposes port 8000
- Automatically runs migrations and starts the Django development server
- Configured with debug mode enabled

### Frontend Service
- Built from the `./frontend` directory
- Development mode with volume mapping for code changes
- Node modules are preserved in a Docker volume
- Exposes port 3000
- Depends on the backend service
- Configured with the backend API URL

### Networks
- Uses a bridge network named `cboe-net` for service communication

## Development Environment

### Running in Development Mode

For development purposes, you can run services with hot-reloading enabled:

```bash
# Run with development configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Frontend Development

The frontend uses Next.js with TypeScript and is styled with Tailwind CSS:

1. **Development Server**:
   ```bash
   # Run only the frontend in development mode
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up frontend
   ```

2. **Accessing Dev Tools**:
   ```bash
   # Open a shell in the frontend container
   docker exec -it cboe-frontend-1 sh
   
   # Run commands like npm install or npm run build
   npm install some-package
   ```

3. **Environment Variables**: 
   - Frontend environment variables are defined in `.env.local`
   - You can modify them and restart the container to apply changes

### Backend Development

The backend uses Django REST Framework with PostgreSQL:

1. **Running Migrations**:
   ```bash
   # Create new migrations
   docker-compose exec backend python manage.py makemigrations
   
   # Apply migrations
   docker-compose exec backend python manage.py migrate
   ```

2. **Django Management Commands**:
   ```bash
   # Run a Django management command
   docker-compose exec backend python manage.py [command]
   ```

3. **Interactive Shell**:
   ```bash
   # Access the Django shell
   docker-compose exec backend python manage.py shell
   ```

## Advanced Docker Configuration

### Customizing Docker Compose

You can customize the Docker setup by creating a `docker-compose.override.yml` file:

```yaml
version: '3.8'

services:
  backend:
    environment:
      - DEBUG=True
    volumes:
      - ./custom_scripts:/app/custom_scripts
    
  frontend:
    environment:
      - NEXT_PUBLIC_CUSTOM_FEATURE=enabled
    
  # Add additional services
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
```

### Resource Constraints

To set resource constraints for containers:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Using Docker Secrets

For sensitive information, you can use Docker secrets:

```yaml
services:
  backend:
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

### Multi-Stage Builds

The Dockerfiles use multi-stage builds to optimize image size and build performance:

1. **Build Stage**: Installs dependencies and builds the application
2. **Production Stage**: Copies only necessary files from the build stage

This results in smaller, more secure Docker images for deployment.

## Troubleshooting

### Common Issues

1. **Docker services not starting**:
   ```bash
   # Check the status of your containers
   docker-compose ps
   
   # Check logs for more detailed errors
   docker-compose logs
   ```

2. **Database connection issues**:
   ```bash
   # Make sure the database is running
   docker-compose ps db
   
   # Check database logs
   docker-compose logs db
   ```

3. **Frontend not connecting to backend**:
   - Verify that your `.env.local` file has the correct `NEXT_PUBLIC_API_URL`
   - Check if the backend is accessible via browser at http://localhost:8000/api/

4. **React-icons not loading**:
   ```bash
   # Install react-icons directly in the frontend container
   docker exec -it cboe-frontend-1 npm install react-icons
   
   # Restart the frontend service
   docker-compose restart frontend
   ```

5. **Rebuilding containers after code changes**:
   ```bash
   # Rebuild specific service
   docker-compose up -d --build frontend
   
   # Rebuild all services
   docker-compose up -d --build
   ```

### Reinstalling All Dependencies

If you encounter persistent issues, you can try rebuilding everything from scratch:

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: This will delete your database data)
docker-compose down -v

# Rebuild all services
docker-compose up -d --build
```

## Updating the Application

To update the application with the latest changes:

```bash
# Pull the latest code
git pull

# Rebuild containers with the latest code
docker-compose up -d --build
```

## API Endpoints

The application provides the following API endpoints:

- Authentication:
  - `POST /api/auth/login/` - User login
  - `POST /api/auth/register/` - User registration
  - `POST /api/auth/refresh/` - Refresh authentication token
  - `POST /api/auth/password/change/` - Change password

- File Management:
  - `POST /api/upload/` - Upload and process a PITCH data file
  - `GET /api/files/` - List all uploaded files
  - `GET /api/files/{id}/` - Get details for a specific file
  - `DELETE /api/files/{id}/` - Delete a file

- User Profile:
  - `GET /api/users/me/` - Get current user profile
  - `PUT /api/users/me/` - Update user profile

## Demo Video

Watch a demonstration of the CBOE PITCH Data Processor in action:

[![CBOE PITCH Data Processor Demo](https://img.youtube.com/vi/GxddScu_uzA/0.jpg)](https://youtu.be/GxddScu_uzA)

## License

[MIT License](LICENSE)

## Acknowledgements

- [CBOE](https://www.cboe.com/) for the PITCH specification
- [Next.js](https://nextjs.org/) for the frontend framework
- [Django](https://www.djangoproject.com/) for the backend framework
- [Docker](https://www.docker.com/) for containerization 