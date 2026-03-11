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

export async function test_api_superadmin_capacity_monitoring_normal_operation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Call capacity monitoring endpoint
  const capacitySummary =
    await api.functional.discussionBoard.superAdmin.alerts.capacity.at(
      superAdminConnection,
    );
  typia.assert(capacitySummary);
  // Validate storage utilization is healthy (<70%)
  TestValidator.predicate(
    "storage utilization should be below 70%",
    capacitySummary.storage_utilization.current_value < 70,
  );
  TestValidator.equals(
    "storage utilization alert status should be healthy",
    capacitySummary.storage_utilization.alert_status,
    "healthy",
  );
  TestValidator.equals(
    "storage utilization unit should be percent",
    capacitySummary.storage_utilization.unit,
    "percent",
  );
  // Validate performance metrics
  TestValidator.predicate(
    "CPU utilization should be between 0 and 100",
    capacitySummary.performance_metrics.cpu_utilization >= 0 &&
      capacitySummary.performance_metrics.cpu_utilization <= 100,
  );
  TestValidator.predicate(
    "memory usage should be between 0 and 100",
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
  // Validate system load indicators
  TestValidator.predicate(
    "queue depth should be non-negative",
    capacitySummary.system_load.queue_depth >= 0,
  );
  TestValidator.predicate(
    "active connections should be non-negative",
    capacitySummary.system_load.active_connections >= 0,
  );
}
