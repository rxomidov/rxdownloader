FROM node:18

# Install python3 + ffmpeg (yt-dlp needs these)
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg

# Install yt-dlp globally (extra safety)
RUN pip3 install -U yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "start"]
