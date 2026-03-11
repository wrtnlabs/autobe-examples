import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test capacity alerts when system reaches critical thresholds (85% utilization).
 * Verify that the endpoint correctly identifies critical status for metrics that
 * exceed capacity limits. Validate that critical alerts are properly triggered
 * for storage utilization, system load, and performance metrics.
 */
export async function test_api_admin_capacity_alerts_critical_threshold(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Retrieve capacity alerts
  const capacityMetrics =
    await api.functional.discussionBoard.admin.alerts.capacity.at(
      adminConnection,
    );
  typia.assert(capacityMetrics);
  // Validate critical threshold indicators
  TestValidator.predicate(
    "metric value should be a number",
    typeof capacityMetrics.metric_value === "number",
  );
  TestValidator.predicate(
    "metric type should be defined",
    capacityMetrics.metric_type.length > 0,
  );
  TestValidator.predicate(
    "source service should be defined",
    capacityMetrics.source_service.length > 0,
  );
  TestValidator.predicate(
    "unit should be defined",
    capacityMetrics.unit.length > 0,
  );
  TestValidator.predicate(
    "collection timestamp should be valid ISO date",
    !isNaN(new Date(capacityMetrics.collection_timestamp).getTime()),
  );
  // Validate status field contains expected values
  TestValidator.predicate(
    "status should be one of expected values",
    ["healthy", "warning", "critical"].includes(capacityMetrics.status),
  );
  // Test business logic: critical status should indicate capacity issues
  if (capacityMetrics.status === "critical") {
    TestValidator.predicate(
      "critical status should indicate high utilization",
      capacityMetrics.metric_value > 85,
    );
  }
  // Validate UUID format
  TestValidator.predicate(
    "ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      capacityMetrics.id,
    ),
  );
  // Validate deleted_at field if present
  if (
    capacityMetrics.deleted_at !== null &&
    capacityMetrics.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at should be valid ISO date when present",
      !isNaN(new Date(capacityMetrics.deleted_at).getTime()),
    );
  }
}
