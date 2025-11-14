import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

/**
 * Test that the average response time for successful refresh is below 100ms
 * under production load. Measure median response time across 1000 requests and
 * verify it does not exceed 100ms (excluding network latency).
 *
 * This test evaluates the performance of the moderator refresh token endpoint
 * under load by making 1000 consecutive successful refresh requests and
 * validating that the median response time is below the 100ms threshold. For
 * each request, a fresh refresh token is generated to simulate realistic
 * production conditions where refresh tokens are single-use.
 *
 * 1. Generate a valid refresh token using
 *    typia.random<IPoliticalForumModerator.IRefresh>() for each request
 * 2. Execute 1000 sequential refresh requests to measure performance
 * 3. Record the duration of each request
 * 4. Calculate the median response time from all 1000 requests
 * 5. Verify the median response time is below 100ms
 */
export async function test_api_moderator_refresh_response_time(
  connection: api.IConnection,
) {
  // Array to store response times
  const responseTimes: number[] = [];

  // Execute 1000 consecutive refresh requests with fresh tokens
  await ArrayUtil.asyncRepeat(1000, async (index) => {
    // Generate a new refresh token for each request to comply with single-use token policy
    const refreshToken = typia.random<IPoliticalForumModerator.IRefresh>();

    const startTime = Date.now();
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshToken,
    });
    const endTime = Date.now();
    responseTimes.push(endTime - startTime);
  });

  // Calculate median response time
  const sortedTimes = [...responseTimes].sort((a, b) => a - b);
  const medianTime =
    sortedTimes.length % 2 === 0
      ? (sortedTimes[sortedTimes.length / 2 - 1] +
          sortedTimes[sortedTimes.length / 2]) /
        2
      : sortedTimes[Math.floor(sortedTimes.length / 2)];

  // Verify median response time is below 100ms
  TestValidator.predicate(
    "median refresh response time below 100ms",
    medianTime < 100,
  );
}
