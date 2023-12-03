# Use an official Node.js runtime as a parent image
FROM --platform=linux/amd64 node:16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) into the container
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Copy the rest of your application's code into the container
COPY . .

# Your application's default port, change if different
EXPOSE 3000

# Define the command to run your app (what you would normally run to start your app)
CMD [ "node", "index.js" ]
