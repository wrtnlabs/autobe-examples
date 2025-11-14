import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_server_time_sync(
  connection: api.IConnection,
) {
  const loginBody = typia.random<IPoliticalForumModerator.ILogin>();

  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(response);

  // Record server time after API call to include network latency
  const serverTimestamp = new Date().getTime();

  // Extract the access token from the response
  const accessToken = response.token.access;

  // Decode the JWT to extract the 'iat' claim (issued at timestamp)
  // JWT structure: header.payload.signature
  const payloadBase64 = accessToken.split(".")[1];
  const payloadJson = atob(payloadBase64);
  const payload = JSON.parse(payloadJson);

  // Convert JWT iat (seconds) to milliseconds for comparison
  const tokenIssuedAtMs = payload.iat * 1000;

  // Verify the token's issued at time is within 5 seconds (5000ms) of server time
  const timeDifferenceMs = Math.abs(serverTimestamp - tokenIssuedAtMs);

  TestValidator.predicate(
    "access token iat claim is within 5 seconds of server time",
    timeDifferenceMs <= 5000,
  );
}
