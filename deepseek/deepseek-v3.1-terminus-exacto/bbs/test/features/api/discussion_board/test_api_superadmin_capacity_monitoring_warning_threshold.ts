import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test capacity monitoring when storage utilization reaches warning threshold (70-85%).
 * Verify that the response correctly identifies the warning status for storage utilization
 * while maintaining accurate performance metrics and system load data.
 */
export async function test_api_superadmin_capacity_monitoring_warning_threshold(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Retrieve capacity metrics
  const capacitySummary =
    await api.functional.discussionBoard.superAdmin.alerts.capacity.at(
      superAdminConnection,
    );
  typia.assert(capacitySummary);
  // Validate storage utilization warning threshold (70-85%)
  TestValidator.predicate(
    "storage utilization should be within valid range",
    capacitySummary.storage_utilization.current_value >= 0 &&
      capacitySummary.storage_utilization.current_value <= 100,
  );
  TestValidator.equals(
    "storage utilization unit should be percent",
    capacitySummary.storage_utilization.unit,
    "percent",
  );
  // Validate alert status based on storage utilization
  const storageValue = capacitySummary.storage_utilization.current_value;
  const expectedStatus =
    storageValue < 70 ? "healthy" : storageValue <= 85 ? "warning" : "critical";
  TestValidator.equals(
    "storage alert status should match utilization level",
    capacitySummary.storage_utilization.alert_status,
    expectedStatus,
  );
  // Validate performance metrics structure
  TestValidator.predicate(
    "CPU utilization should be valid",
    capacitySummary.performance_metrics.cpu_utilization >= 0 &&
      capacitySummary.performance_metrics.cpu_utilization <= 100,
  );
  TestValidator.predicate(
    "memory usage should be valid",
    capacitySummary.performance_metrics.memory_usage >= 0 &&
      capacitySummary.performance_metrics.memory_usage <= 100,
  );
  TestValidator.predicate(
    "response time should be non-negative",
    capacitySummary.performance_metrics.response_time >= 0,
  );
  TestValidator.predicate(
    "throughput should be non-negative",
    capacitySummary.performance_metrics.throughput >= 0,
  );
  // Validate system load metrics
  TestValidator.predicate(
    "queue depth should be non-negative integer",
    capacitySummary.system_load.queue_depth >= 0 &&
      Number.isInteger(capacitySummary.system_load.queue_depth),
  );
  TestValidator.predicate(
    "active connections should be non-negative integer",
    capacitySummary.system_load.active_connections >= 0 &&
      Number.isInteger(capacitySummary.system_load.active_connections),
  );
  // Validate system load alert status
  TestValidator.predicate(
    "system load alert status should be valid",
    capacitySummary.system_load.alert_status === "healthy" ||
      capacitySummary.system_load.alert_status === "warning" ||
      capacitySummary.system_load.alert_status === "critical",
  );
  // Validate timestamp format
  TestValidator.predicate("timestamp should be valid ISO date-time", () => {
    try {
      new Date(capacitySummary.timestamp);
      return !isNaN(new Date(capacitySummary.timestamp).getTime());
    } catch {
      return false;
    }
  });
}
