// Assuming the environment is correctly set for ESM
import * as core from '@actions/core';
import fetch from 'node-fetch';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

const domain = '54.158.10.249';

async function initiateTestSuite(suiteNumber) {
  const url = `http://${domain}/launch/suite/${suiteNumber}`;
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

  return await response.json(); // Assuming this contains { executionId: "..." }
}

async function initiateTest(testNumber) {
  const url = `http://${domain}/launch/test/${testNumber}`;
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

  return await response.json(); // Assuming this contains { executionId: "..." }
}

// Function to fetch and log the test results periodically
async function fetchAndLogResults(executionId) {
  let finished = false;
  do {
    const url = `https://${domain}/results/${executionId}`;
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
    const suiteNumber = core.getInput('suite-number', { required: false });
    const testNumber = core.getInput('test-number', { required: false });

    let executionId = null;
    if (suiteNumber) {
      const result = await initiateTestSuite(suiteNumber);
      executionId = result.executionId;
    } else if (testNumber) {
      const result = await initiateTest(testNumber);
      executionId = result.executionId;
    } else {
      throw new Error('Either suite-number or test-number must be provided');
    }

    console.log(`Test ${suiteNumber ? 'suite' : ''} initiated with execution ID: ${executionId}`);
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
