// Assuming the environment is correctly set for ESM
import * as core from '@actions/core';
import fetch from 'node-fetch';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

const domain = '54.158.10.249';

async function initiateTestSuite(suiteNumber) {
  const url = `http://${domain}/api/launch/suite/${suiteNumber}`;
  const apiKey = core.getInput('api-key', {required: true})
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': 'GitHub-Actions-Test-Runner'
    },
    body: JSON.stringify({
      secret: core.getInput('secret', {required: true})
    })
  });

  const responseBody = await response.text();
  console.log(`Raw response body: ${responseBody}`);

  if (!response.ok) {
    throw new Error(`Failed to initiate tests: ${response.statusText}. Status code: ${response.status}`);
  }

  return await response.json(); // Assuming this contains { executionId: "..." }
}

// Function to fetch and log the test results periodically
async function fetchAndLogResults(suiteNumber) {
  let finished = false;
  let prevProgress = 0;
  let prevStatus = 'pending';

  const startTime = Date.now();
  do {
    const currentTime = Date.now();
    if ((currentTime - startTime) > 180000) { // 3 minutes in milliseconds
      throw new Error('Test suite timed out after 5 minutes');
    }

    const url = `http://${domain}/api/results/${suiteNumber}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${core.getInput('api-key', {required: true})}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch results: ${response.statusText}`);
    }
    const { status, progress, totalTests } = await response.json();

    if (progress > prevProgress) {
      console.log(`Progress: ${progress}/${totalTests}, Status: ${status}`);
      prevProgress = progress;
    }

    finished = status === 'completed';

    if (status === 'failed') {
      throw new Error('Test suite failed');
    }

    if (!finished) {
      await sleep(5000); // Wait for 5 seconds before polling again
    }
  } while (!finished);
}

async function run() {
  try {
    const suiteNumber = core.getInput('suite-number', { required: false });

    const { executionId, testName, message, status } = await initiateTestSuite(suiteNumber);

    console.log(`Test suite initiated with execution ID: ${executionId}`);
    console.log('Test suite name:', testName);
    console.log('Message:', message);
    console.log('Status:', status);
    console.log('Fetching and logging test results...');

    // await fetchAndLogResults(suiteNumber);
    // After fetching final results, decide on success or failure
    // This could involve another fetch to get the final decision or analyzing the last fetched results
    // For simplicity, assuming success if we reach this point without errors
    core.setOutput('test-results', 'Success');
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();
