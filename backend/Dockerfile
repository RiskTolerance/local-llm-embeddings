FROM node:20

WORKDIR /app

# Copy package files for better caching
COPY package.json package-lock.json* ./

# Install dependencies (sharp will now find libvips)
RUN npm install

# Copy source code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]