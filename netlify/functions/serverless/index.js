const cookie = require('cookie');
const { EleventyServerless } = require('@11ty/eleventy');
const jwt = require('jsonwebtoken');

// Explicit dependencies for the bundler from config file and global data.
// The file is generated by the Eleventy Serverless Bundler Plugin.
require('./eleventy-bundler-modules.js');

async function handler(event) {
  let elev = new EleventyServerless('serverless', {
    path: event.path,
    query: event.queryStringParameters,
    functionsDir: './netlify/functions/',
  });

  try {
    let [page] = await elev.getOutput();

    // If you want some of the data cascade available in `page.data`, use `eleventyConfig.dataFilterSelectors`.
    // Read more: https://www.11ty.dev/docs/config/#data-filter-selectors

    const cookies = event.headers.cookie && cookie.parse(event.headers.cookie);

    if (!cookies?._weka_oauth_token) {
      return {
        statusCode: 302,
        headers: {
          Location: '/',
        },
      };
    }

    const token = jwt.verify(cookies._weka_oauth_token, process.env.JWT_SECRET);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
      },
      body: page.content,
    };
  } catch (error) {
    // Only console log for matching serverless paths
    // (otherwise you’ll see a bunch of BrowserSync 404s for non-dynamic URLs during --serve)
    if (elev.isServerlessUrl(event.path)) {
      console.log("Serverless Error:", error);
    }

    return {
      statusCode: error.httpStatusCode || 500,
      body: JSON.stringify(
        {
          error: error.message,
        },
        null,
        2
      ),
    };
  }
}

exports.handler = handler;
