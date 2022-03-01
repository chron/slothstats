const fetch = require('node-fetch');
const sortBy = require('lodash.sortby');

const query = `
  query {
    search(query: "org:storypark is:pr created:>2022-02-06 NOT combo in:title SLOW- OR GIRA- OR WEKA-", type: ISSUE, first: 100) {
      nodes {
        ... on PullRequest {
          author {
            login
          }
          reviews(states: APPROVED, first: 5) {
            nodes {
              author {
                login
              }
            }
          }
        }
      }
    }
  }
`;

module.exports = async function scores() {
  const githubResponse = await fetch('https://api.github.com/graphql',{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    },
    body: JSON.stringify({ query })
  });
  const githubJson = await githubResponse.json();

  const prAuthors = githubJson.data.search.nodes.map(node => node.author.login);
  const allReviews = githubJson.data.search.nodes.flatMap(node => node.reviews.nodes.map(innerNode => innerNode.author.login));
  const uniqueUsers = [...new Set(prAuthors.concat(allReviews))];

  const reviewCounts = allReviews.reduce((accum, username) => {
    return {
      ...accum,
      [username]: (accum[username] || 0) + 1,
    };
  }, {});

  const prCounts = prAuthors.reduce((accum, username) => {
    return {
      ...accum,
      [username]: (accum[username] || 0) + 1,
    };
  }, {});

  const sortedUsers = sortBy(uniqueUsers, u =>  -1000 * (reviewCounts[u] ?? 0) - (prCounts[u] ?? 0));

  return sortedUsers.map((user) => {
    return {
      user,
      reviewCount: reviewCounts[user] || 0,
      prCount: prCounts[user] || 0,
    };
  });
}
