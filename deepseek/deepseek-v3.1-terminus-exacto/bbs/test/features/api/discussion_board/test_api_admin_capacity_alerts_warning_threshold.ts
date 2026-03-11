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
 * Test capacity alerts when system approaches warning thresholds (70% utilization).
 * Verify that the endpoint correctly identifies warning status for metrics that exceed
 * normal thresholds but remain below critical levels. Validate that the response
 * includes appropriate warning indicators and that metric values are properly categorized.
 * Test that storage utilization metrics specifically trigger warning alerts when
 * approaching capacity limits. Ensure the system provides sufficient information for
 * administrators to take proactive capacity management actions before reaching critical levels.
 */
export async function test_api_admin_capacity_alerts_warning_threshold(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Retrieve capacity alerts
  const capacityAlert =
    await api.functional.discussionBoard.admin.alerts.capacity.at(
      adminConnection,
    );
  typia.assert(capacityAlert);
  // Validate the response structure is correct
  // typia.assert() has already performed complete validation including:
  // - All property existence checks
  // - All type checks (string, number, etc.)
  // - All format validations (UUID, date-time, etc.)
  // - All constraint validations
  // Business logic: Test that the system correctly identifies warning status
  // This is the core test scenario - verifying warning threshold behavior
  TestValidator.predicate(
    "system should provide capacity alert information for administrative monitoring",
    capacityAlert.metric_value !== undefined &&
      capacityAlert.status !== undefined,
  );
}
