/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getInput, setFailed, setOutput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { createCheck } from "./createCheck";
import { createDeployment } from "./createDeployment";
import { postChannelSuccessComment } from "./postOrUpdateComment";

const token = process.env.GITHUB_TOKEN || getInput("repoToken");
const octokit = token ? getOctokit(token) : undefined;

const urls = getInput("urls", { required: true })
  .split(",")
  .map((x) => x.trim());
const expiry = getInput("expire_time", { required: true });
const details_url = getInput("details_url", { required: true });
const failure = getInput("failure") === "true";
const error_message = getInput("error_message") ?? "";
const reportAsDeployment = getInput("reportAsDeployment") === "true";

async function run() {
  const isPullRequest = !!context.payload.pull_request;

  let finish = (details: Object) => console.log(details);
  if (token && isPullRequest && !reportAsDeployment) {
    finish = await createCheck(octokit, context);
  }
  if (token && reportAsDeployment) {
    finish = await createDeployment(octokit, context);
  }

  if (!failure) {
    await finish({
      details_url,
      conclusion: "success",
      output: {
        title: `Deploy succeeded`,
        summary: `${urls.join(", ")}`,
      },
    });

    setOutput("urls", urls);
    setOutput("expire_time", expiry);
    setOutput("details_url", details_url);

    const urlsListMarkdown =
      urls.length === 1
        ? `[${urls[0]}](${urls[0]})`
        : urls.map((url) => `- [${url}](${url})`).join("\n");

    if (token && isPullRequest && !!octokit) {
      const commitId = context.payload.pull_request?.head.sha.substring(0, 7);

      await postChannelSuccessComment(octokit, context, urls, commitId, expiry);
    }
  } else {
    setFailed(error_message);

    await finish({
      conclusion: "failure",
      output: {
        title: "Deploy failed",
        summary: `Error: ${error_message}`,
      },
    });
  }
}

run();
