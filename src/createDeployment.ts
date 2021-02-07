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
import type { Context } from "@actions/github/lib/context";
import type { GitHub } from "@actions/github/lib/utils";

// create a deployment and return a function that updates (completes) it
export async function createDeployment(
  github: InstanceType<typeof GitHub>,
  context: Context
) {
  const check = await github.repos.createDeployment({
    ...context.repo,
    ref: context.ref,
    description:
      context.ref == "refs/head/stable"
        ? "Production"
        : `Branch ${context.ref.replace(/refs\/head\//g, "")}`,
    environment: context.ref == "refs/head/stable" ? "Production" : "Staging",
    // transient_environment: context.ref != "refs/head/stable",
    // mediaType: {
    //   previews: ["ant-man"],
    // },
    created_at: new Date().toISOString(),
    auto_merge: false,
    required_contexts: [],
  });

  return async (details: any) => {
    const isSuccess = details.conclusion && details.conclusion === "success";
    await github.repos.createDeploymentStatus({
      deployment_id: check.data.id,
      ...context.repo,
      environment_url: isSuccess ? details.details_url : "",
      state: isSuccess ? "success" : "failure",
    });
  };
}
