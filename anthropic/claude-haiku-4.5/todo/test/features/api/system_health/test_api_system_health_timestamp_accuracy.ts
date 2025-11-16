import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemHealth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemHealth";

export async function test_api_system_health_timestamp_accuracy(
  connection: api.IConnection,
) {
  // Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(admin);

  // Get first health snapshot
  const firstHealth =
    await api.functional.todoApp.admin.systemHealth.at(connection);
  typia.assert(firstHealth);

  // Validate first timestamp is in ISO 8601 format
  TestValidator.predicate(
    "first health timestamp is valid ISO 8601 date-time",
    () => {
      const date = new Date(firstHealth.timestamp);
      return !isNaN(date.getTime()) && firstHealth.timestamp.includes("T");
    },
  );

  const firstTimestamp = new Date(firstHealth.timestamp);
  const requestTime1 = new Date();

  // Verify first timestamp is current (within approximately 60 seconds of request)
  const timeDiff1 = Math.abs(requestTime1.getTime() - firstTimestamp.getTime());
  TestValidator.predicate(
    "first health timestamp is current (within 60 seconds)",
    timeDiff1 <= 60000,
  );

  // Wait a moment and get second health snapshot
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const secondHealth =
    await api.functional.todoApp.admin.systemHealth.at(connection);
  typia.assert(secondHealth);

  // Validate second timestamp is in ISO 8601 format
  TestValidator.predicate(
    "second health timestamp is valid ISO 8601 date-time",
    () => {
      const date = new Date(secondHealth.timestamp);
      return !isNaN(date.getTime()) && secondHealth.timestamp.includes("T");
    },
  );

  const secondTimestamp = new Date(secondHealth.timestamp);
  const requestTime2 = new Date();

  // Verify second timestamp is current
  const timeDiff2 = Math.abs(
    requestTime2.getTime() - secondTimestamp.getTime(),
  );
  TestValidator.predicate(
    "second health timestamp is current (within 60 seconds)",
    timeDiff2 <= 60000,
  );

  // Verify timestamps are properly updated across requests
  // The second timestamp should be >= the first timestamp
  TestValidator.predicate(
    "second health timestamp is greater than or equal to first timestamp",
    secondTimestamp.getTime() >= firstTimestamp.getTime(),
  );

  // Get a third health snapshot to further verify timestamp freshness
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const thirdHealth =
    await api.functional.todoApp.admin.systemHealth.at(connection);
  typia.assert(thirdHealth);

  const thirdTimestamp = new Date(thirdHealth.timestamp);
  const requestTime3 = new Date();

  // Verify third timestamp is current
  const timeDiff3 = Math.abs(requestTime3.getTime() - thirdTimestamp.getTime());
  TestValidator.predicate(
    "third health timestamp is current (within 60 seconds)",
    timeDiff3 <= 60000,
  );

  // Verify progression of timestamps shows data freshness
  TestValidator.predicate(
    "third health timestamp is greater than or equal to second timestamp",
    thirdTimestamp.getTime() >= secondTimestamp.getTime(),
  );

  // Validate timestamp format consistency across all responses
  TestValidator.predicate(
    "all health timestamps follow consistent ISO 8601 format",
    () => {
      const iso8601Regex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/;
      return (
        iso8601Regex.test(firstHealth.timestamp) &&
        iso8601Regex.test(secondHealth.timestamp) &&
        iso8601Regex.test(thirdHealth.timestamp)
      );
    },
  );
}
