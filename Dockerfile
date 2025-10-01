FROM node:18

# Install yt-dlp + ffmpeg directly from apt
RUN apt-get update && apt-get install -y yt-dlp ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "start"]
