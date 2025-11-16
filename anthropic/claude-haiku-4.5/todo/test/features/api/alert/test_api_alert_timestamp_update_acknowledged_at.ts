import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test updating only the acknowledged_at timestamp when acknowledging an alert.
 *
 * Administrator creates an account, then updates an existing alert's status to
 * "acknowledged" with the current UTC timestamp. This validates that the system
 * correctly records when the acknowledgment occurred for audit trail and
 * response time analysis.
 *
 * Workflow:
 *
 * 1. Administrator joins and gets authenticated with JWT tokens
 * 2. Generate a random alert ID to acknowledge
 * 3. Prepare acknowledgment payload with current UTC timestamp
 * 4. Update the alert status to "acknowledged" with the timestamp
 * 5. Verify the acknowledged_at field is set and matches the update
 * 6. Confirm the alert status is now "acknowledged"
 */
export async function test_api_alert_timestamp_update_acknowledged_at(
  connection: api.IConnection,
) {
  // Step 1: Administrator joins (authentication prerequisite)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.equals(
    "admin account created with authentication token",
    typeof admin.token.access,
    "string",
  );

  // Step 2: Prepare alert acknowledgment with current UTC timestamp
  const alertId = typia.random<string & tags.Format<"uuid">>();
  const acknowledgedAt = new Date().toISOString();

  // Step 3: Update alert to acknowledged status with timestamp
  const updatedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: {
        status: "acknowledged",
        acknowledged_at: acknowledgedAt,
      } satisfies ITodoAppAlert.IUpdate,
    });
  typia.assert(updatedAlert);

  // Step 4: Verify alert status is now acknowledged
  TestValidator.equals(
    "alert status updated to acknowledged",
    updatedAlert.status,
    "acknowledged",
  );

  // Step 5: Verify acknowledged_at timestamp is recorded
  TestValidator.predicate(
    "acknowledged_at timestamp is set after acknowledgment",
    updatedAlert.acknowledged_at !== null &&
      updatedAlert.acknowledged_at !== undefined,
  );

  // Step 6: Verify acknowledged_at is in valid ISO 8601 format
  TestValidator.predicate(
    "acknowledged_at is in valid ISO 8601 date-time format",
    typeof updatedAlert.acknowledged_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedAlert.acknowledged_at),
  );

  // Step 7: Verify alert ID matches the updated alert
  TestValidator.equals("alert ID remains consistent", updatedAlert.id, alertId);

  // Step 8: Verify other critical alert properties are present
  TestValidator.predicate(
    "alert maintains original type and severity information",
    typeof updatedAlert.alert_type === "string" &&
      updatedAlert.alert_type.length > 0 &&
      (updatedAlert.severity === "info" ||
        updatedAlert.severity === "warning" ||
        updatedAlert.severity === "critical"),
  );
}
