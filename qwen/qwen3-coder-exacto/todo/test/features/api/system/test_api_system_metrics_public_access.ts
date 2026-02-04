import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetric";
export async function test_api_system_metrics_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Test that the system metrics endpoint can be accessed without authentication
  // and returns comprehensive metrics data. This endpoint is public and should
  // provide system health information, user statistics, and todo metrics.
  // Call the system metrics endpoint without any authentication
  const metrics: ITodoAppSystemMetric =
    await api.functional.todoApp.system.metrics.at(connection);
  // Validate that we received a proper response with all required fields
  typia.assert(metrics);
  // Verify that all numeric metrics are non-negative as expected
  TestValidator.predicate(
    "active user count should be non-negative",
    metrics.activeUserCount >= 0,
  );
  TestValidator.predicate(
    "total todos should be non-negative",
    metrics.totalTodos >= 0,
  );
  TestValidator.predicate(
    "completed todos should be non-negative",
    metrics.completedTodos >= 0,
  );
  TestValidator.predicate(
    "pending todos should be non-negative",
    metrics.pendingTodos >= 0,
  );
  TestValidator.predicate(
    "recent signups should be non-negative",
    metrics.recentSignups >= 0,
  );
  // Verify that system health is one of the expected values
  TestValidator.predicate(
    "system health should be a valid status",
    ["healthy", "degraded", "unhealthy"].includes(metrics.systemHealth),
  );
  // Verify that database performance is a valid number
  TestValidator.predicate(
    "database performance should be a valid number",
    typeof metrics.databasePerformance === "number" &&
      !isNaN(metrics.databasePerformance),
  );
  // Verify that uptime is a valid percentage (0-100)
  TestValidator.predicate(
    "uptime should be a valid percentage",
    typeof metrics.uptime === "number" &&
      metrics.uptime >= 0 &&
      metrics.uptime <= 100,
  );
  // Verify that timestamp is a valid date string
  TestValidator.predicate("timestamp should be a valid date string", () => {
    const date = new Date(metrics.timestamp);
    return date.toString() !== "Invalid Date";
  });
  // Verify that completed + pending todos equals total todos
  TestValidator.equals(
    "completed and pending todos should sum to total todos",
    metrics.completedTodos + metrics.pendingTodos,
    metrics.totalTodos,
  );
}
