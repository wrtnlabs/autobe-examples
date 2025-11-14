import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_process_time_constant(
  connection: api.IConnection,
) {
  // Generate random email and password for valid credentials
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(12);
  const validCredentials = `${validEmail}:${validPassword}`;

  // Generate random email and password for invalid credentials
  const invalidEmail = typia.random<string & tags.Format<"email">>();
  const invalidPassword = RandomGenerator.alphaNumeric(12);
  const invalidCredentials = `${invalidEmail}:${invalidPassword}`;

  // Collect timing data for valid logins
  const validLatencies: number[] = [];
  for (let i = 0; i < 20; i++) {
    const startTime = Date.now();
    await api.functional.auth.moderator.login(connection, {
      body: validCredentials,
    });
    const endTime = Date.now();
    validLatencies.push(endTime - startTime);
  }

  // Collect timing data for invalid logins
  const invalidLatencies: number[] = [];
  for (let i = 0; i < 20; i++) {
    const startTime = Date.now();
    await TestValidator.error(
      "invalid login should fail with wrong credentials",
      async () => {
        await api.functional.auth.moderator.login(connection, {
          body: invalidCredentials,
        });
      },
    );
    const endTime = Date.now();
    invalidLatencies.push(endTime - startTime);
  }

  // Calculate average latencies
  const avgValidLatency =
    validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length;
  const avgInvalidLatency =
    invalidLatencies.reduce((a, b) => a + b, 0) / invalidLatencies.length;

  // Calculate variance
  const validVariance = Math.sqrt(
    validLatencies.reduce(
      (acc, val) => acc + Math.pow(val - avgValidLatency, 2),
      0,
    ) / validLatencies.length,
  );
  const invalidVariance = Math.sqrt(
    invalidLatencies.reduce(
      (acc, val) => acc + Math.pow(val - avgInvalidLatency, 2),
      0,
    ) / invalidLatencies.length,
  );

  // Validate that variance is under 20ms
  TestValidator.predicate(
    "valid login time variance < 20ms",
    validVariance < 20,
  );
  TestValidator.predicate(
    "invalid login time variance < 20ms",
    invalidVariance < 20,
  );

  // Validate that valid and invalid login times are within 10ms of each other (constant time)
  TestValidator.predicate(
    "login time consistency",
    Math.abs(avgValidLatency - avgInvalidLatency) < 10,
  );
}
