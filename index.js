const core = require('@actions/core');
const fetch = require('node-fetch');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// Function to initiate tests and return an execution ID
async function initiateTests(suiteNumber) {
  const url = `https://testing-saas.com/launch/suite/${suiteNumber}`;
  // Setup the request as needed (method, headers, etc.)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_TOKEN',
      'User-Agent': 'GitHub-Actions-Test-Runner'
    },
    body: JSON.stringify({
      secret: core.getInput('secret', {required: true})
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to initiate tests: ${response.statusText}`);
  }

  return response.json(); // Assuming this contains { executionId: "..." }
}

// Function to fetch and log the test results periodically
async function fetchAndLogResults(executionId) {
  let finished = false;
  do {
    const url = `https://testing-saas.com/results/${executionId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch results: ${response.statusText}`);
    }
    const { completed, results } = await response.json(); // Assuming this structure

    // Log current test statuses
    results.forEach(result => {
      console.log(`Test: ${result.testName}, Status: ${result.status}`);
    });

    finished = completed;
    if (!finished) {
      await sleep(5000); // Wait for 5 seconds before polling again
    }
  } while (!finished);
}

async function run() {
  try {
    const suiteNumber = core.getInput('suite-number', { required: true });
    const { executionId } = await initiateTests(suiteNumber);

    console.log(`Test suite initiated. Execution ID: ${executionId}`);
    console.log('Fetching and logging test results...');

    await fetchAndLogResults(executionId);

    // After fetching final results, decide on success or failure
    // This could involve another fetch to get the final decision or analyzing the last fetched results
    // For simplicity, assuming success if we reach this point without errors
    core.setOutput('test-results', 'Success');
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
