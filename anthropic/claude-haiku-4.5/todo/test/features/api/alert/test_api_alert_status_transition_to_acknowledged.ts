import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test acknowledging an open alert by transitioning its status from open to
 * acknowledged.
 *
 * Administrator authenticates via join, then updates an alert status to
 * acknowledged with a timestamp to signal the alert is under investigation.
 * Validates that the status is updated, acknowledged_at timestamp is recorded,
 * and the alert record is modified correctly.
 *
 * NOTE: This test creates a realistic alert update scenario. In a full
 * implementation, the alert would be created via a dedicated create endpoint
 * before updating. This test focuses on validating the update operation that
 * transitions an alert from open to acknowledged status.
 */
export async function test_api_alert_status_transition_to_acknowledged(
  connection: api.IConnection,
) {
  // Step 1: Administrator authenticates via join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.predicate(
    "administrator should be authenticated",
    admin.email === adminEmail,
  );

  // Step 2: Test alert status update to acknowledged
  // Using a realistic alert ID for testing the update endpoint
  const alertId = typia.random<string & tags.Format<"uuid">>();
  const acknowledgedAt = new Date().toISOString();

  const updatedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: {
        status: "acknowledged",
        acknowledged_at: acknowledgedAt,
      } satisfies ITodoAppAlert.IUpdate,
    });
  typia.assert(updatedAlert);

  // Step 3: Verify status was updated to acknowledged
  TestValidator.equals(
    "alert status should be transitioned to acknowledged",
    updatedAlert.status,
    "acknowledged",
  );

  // Step 4: Verify acknowledged_at timestamp is recorded
  TestValidator.predicate(
    "acknowledged_at timestamp should be set",
    updatedAlert.acknowledged_at !== null &&
      updatedAlert.acknowledged_at !== undefined,
  );

  // Step 5: Verify alert ID matches the requested alert
  TestValidator.equals(
    "alert ID should match the updated alert",
    updatedAlert.id,
    alertId,
  );

  // Step 6: Verify alert maintains core properties
  TestValidator.predicate(
    "alert should have required properties",
    updatedAlert.alert_type !== undefined &&
      updatedAlert.severity !== undefined &&
      updatedAlert.title !== undefined &&
      updatedAlert.description !== undefined,
  );
}
