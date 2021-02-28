## build

FROM node:14.15.5-alpine3.13
WORKDIR /usr/src/app
COPY package*.json ./
COPY . .
RUN npm install

## run

EXPOSE 3000
CMD npm start
