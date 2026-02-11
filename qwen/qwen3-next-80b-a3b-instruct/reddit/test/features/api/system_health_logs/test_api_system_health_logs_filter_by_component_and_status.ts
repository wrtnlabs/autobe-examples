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

export async function test_api_system_health_logs_filter_by_component_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Create test system health logs with various statuses and components
  // For this test, we need to ensure we have logs with status='error' and component='database'
  const testLogs = ArrayUtil.repeat(5, () => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    status: RandomGenerator.pick(["error", "warning", "info", "critical"]),
    component: RandomGenerator.pick([
      "database",
      "redis",
      "api_gateway",
      "cache",
      "auth_service",
    ]),
    message: RandomGenerator.paragraph({ sentences: 2 }),
    metadata:
      Math.random() > 0.5
        ? JSON.stringify({
            timestamp: new Date().toISOString(),
            severity: "high",
          })
        : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }));
  // Create specific test logs with the target filter conditions
  const targetLogs = ArrayUtil.repeat(3, () => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    status: "error",
    component: "database",
    message: RandomGenerator.paragraph({ sentences: 2 }),
    metadata:
      Math.random() > 0.5
        ? JSON.stringify({
            timestamp: new Date().toISOString(),
            severity: "high",
          })
        : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }));
  // Create logs using API, we need to handle this with a direct endpoint
  // If there's no create endpoint, then we need to use another method
  // However, since we don't have a create endpoint provided, we need to use the only given endpoint
  // The scenario assumes logs exist, so we need to work with the available endpoints
  // Since there's no create endpoint in the provided API, we're limited to
  // the only provided endpoint: PATCH /redditCommunity/system-health-logs
  // This means we must test only the filter behavior assuming logs exist
  // Use direct request body with exact filter criteria
  const requestBody: IRedditCommunitySystemHealthLog.IRequest = {
    status: ["error"],
    component: ["database"],
  };
  // Call the API endpoint
  const response =
    await api.functional.redditCommunity.system_health_logs.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Verify all returned entries match filter criteria
  for (const log of response.data) {
    TestValidator.equals("status is 'error'", log.status, "error");
    TestValidator.equals("component is 'database'", log.component, "database");
    TestValidator.equals("deleted_at is null", log.deleted_at, null);
  }
  // Verify that no entries with different status or component are returned
  const hasNonErrorStatus = response.data.some((log) => log.status !== "error");
  TestValidator.predicate("no logs with non-error status", !hasNonErrorStatus);
  const hasNonDatabaseComponent = response.data.some(
    (log) => log.component !== "database",
  );
  TestValidator.predicate(
    "no logs with non-database component",
    !hasNonDatabaseComponent,
  );
  // Verify items are sorted by created_at DESC (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at).getTime();
    const next = new Date(response.data[i + 1].created_at).getTime();
    TestValidator.predicate("sorted by created_at DESC", current >= next);
  }
  // The filtering and sorting must be handled by the API server
  // We don't need to validate the exact number of records returned because
  // we don't know exactly how many records exist in the system.
  // We only validate that when the filter is applied, we get only matching records.
}
