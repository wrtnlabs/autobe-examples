import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test direct transition from open to resolved status without intermediate
 * acknowledgment.
 *
 * This test validates the administrator's ability to directly transition an
 * alert from open status to resolved status without going through an
 * acknowledgment step. This workflow supports scenarios where administrators
 * can resolve alerts immediately upon detection without explicit
 * acknowledgment.
 *
 * **Test Steps:**
 *
 * 1. Create administrator account for authentication
 * 2. Prepare alert update request with direct open-to-resolved transition
 * 3. Update the alert status directly from open to resolved
 * 4. Verify resolved_at timestamp is set appropriately
 * 5. Confirm acknowledged_at remains null (no acknowledgment step)
 * 6. Validate the alert response contains all expected properties
 * 7. Validate the status transition was successful
 */
export async function test_api_alert_status_direct_open_to_resolved(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

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

  // Step 2: Prepare the alert ID and resolved timestamp
  const alertId = typia.random<string & tags.Format<"uuid">>();
  const resolvedTimestamp = new Date().toISOString();

  // Step 3: Update alert status directly from open to resolved
  const updateBody = {
    status: "resolved" as const,
    resolved_at: resolvedTimestamp,
    acknowledged_at: null,
  } satisfies ITodoAppAlert.IUpdate;

  const updatedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId,
      body: updateBody,
    });
  typia.assert(updatedAlert);

  // Step 4: Verify the status transition to resolved
  TestValidator.equals(
    "alert status should be resolved after update",
    updatedAlert.status,
    "resolved",
  );

  // Step 5: Verify resolved_at timestamp is set to a valid ISO string
  TestValidator.predicate(
    "resolved_at should be set and formatted as ISO 8601 date-time",
    updatedAlert.resolved_at !== null &&
      updatedAlert.resolved_at !== undefined &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedAlert.resolved_at),
  );

  // Step 6: Verify acknowledged_at remains null (bypassed acknowledgment)
  TestValidator.equals(
    "acknowledged_at should remain null when skipping acknowledgment step",
    updatedAlert.acknowledged_at,
    null,
  );

  // Step 7: Validate alert ID matches request
  TestValidator.equals(
    "alert ID should match the update request",
    updatedAlert.id,
    alertId,
  );

  // Step 8: Validate alert contains required properties
  TestValidator.predicate(
    "alert should have non-empty alert_type",
    typeof updatedAlert.alert_type === "string" &&
      updatedAlert.alert_type.length > 0,
  );

  TestValidator.predicate(
    "alert should have valid severity level",
    ["info", "warning", "critical"].includes(updatedAlert.severity),
  );

  TestValidator.predicate(
    "alert should have non-empty title",
    typeof updatedAlert.title === "string" && updatedAlert.title.length > 0,
  );

  TestValidator.predicate(
    "alert should have non-empty description",
    typeof updatedAlert.description === "string" &&
      updatedAlert.description.length > 0,
  );

  TestValidator.predicate(
    "alert should have valid created_at timestamp",
    typeof updatedAlert.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(updatedAlert.created_at),
  );

  // Step 9: Validate the complete direct transition workflow
  TestValidator.predicate(
    "direct transition from open to resolved should succeed with null acknowledged_at",
    updatedAlert.status === "resolved" &&
      updatedAlert.resolved_at !== null &&
      updatedAlert.acknowledged_at === null,
  );
}
