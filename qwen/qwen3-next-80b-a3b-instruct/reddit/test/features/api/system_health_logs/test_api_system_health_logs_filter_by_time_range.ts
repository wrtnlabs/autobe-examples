import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemHealthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemHealthLog";
import type { IRedditCommunitySystemHealthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemHealthLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_health_logs_filter_by_time_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for system access
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate test time range (24-hour window)
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const endDate = now.toISOString();
  // Create 10 test system health log entries
  const logCount = 10;
  const logs = ArrayUtil.repeat(
    logCount,
    (index) =>
      ({
        id: typia.random<string & tags.Format<"uuid">>(),
        status: RandomGenerator.pick([
          "error",
          "warning",
          "info",
          "critical",
        ]) as any,
        component: RandomGenerator.pick([
          "database",
          "redis",
          "api_gateway",
          "cache",
          "auth_service",
        ]) as any,
        message: RandomGenerator.paragraph({ sentences: 2 }),
        created_at: new Date(
          now.getTime() - (logCount - index) * 60 * 1000,
        ).toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }) satisfies IRedditCommunitySystemHealthLog,
  );
  // Verify that logs have times within our test range
  const createdWithinRange = logs.every((log) => {
    const logTime = new Date(log.created_at).getTime();
    const startMillis = new Date(startDate).getTime();
    const endMillis = new Date(endDate).getTime();
    return logTime >= startMillis && logTime <= endMillis;
  });
  if (!createdWithinRange) {
    // Should never happen with our generation logic, but safety check
    throw new Error("Generated logs not within expected time range");
  }
  // Send PATCH request with time range filter
  const response =
    await api.functional.redditCommunity.system_health_logs.index(
      adminConnection,
      {
        body: {
          startDate,
          endDate,
        } satisfies IRedditCommunitySystemHealthLog.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20); // default limit
  TestValidator.equals(
    "pagination records",
    response.pagination.records,
    logCount,
  );
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  // Validate data content - only logs within our time range should be returned
  TestValidator.equals(
    "data count matches records",
    response.data.length,
    logCount,
  );
  // Verify every returned log is within the specified time range and has correct structure
  for (const log of response.data) {
    typia.assert<IRedditCommunitySystemHealthLog>(log);
    const logTime = new Date(log.created_at).getTime();
    const startMillis = new Date(startDate).getTime();
    const endMillis = new Date(endDate).getTime();
    TestValidator.predicate(
      "log created_at is within range",
      logTime >= startMillis && logTime <= endMillis,
    );
    // Ensure status, component, and other fields are valid
    TestValidator.predicate(
      "status is valid",
      ["error", "warning", "info", "critical"].includes(log.status),
    );
    TestValidator.predicate(
      "component is valid",
      ["database", "redis", "api_gateway", "cache", "auth_service"].includes(
        log.component,
      ),
    );
  }
  // Also verify all the generated logs are present in the response
  const generatedIds = new Set(logs.map((log) => log.id));
  const returnedIds = new Set(response.data.map((log) => log.id));
  TestValidator.equals(
    "all generated logs returned",
    returnedIds.size,
    generatedIds.size,
  );
  for (const id of generatedIds) {
    TestValidator.predicate(
      "generated log id exists in response",
      returnedIds.has(id),
    );
  }
}
