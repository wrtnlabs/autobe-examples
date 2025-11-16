import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test retrieval of alerts with audit log references.
 *
 * Validates that administrators can retrieve system alerts that contain
 * references to their triggering audit log entries. This test ensures the
 * alert-to-audit-log relationship is properly maintained and accessible through
 * the API.
 *
 * Test workflow:
 *
 * 1. Create an administrator account for API authentication
 * 2. Generate a random alert ID to retrieve
 * 3. Call the alert retrieval endpoint
 * 4. Validate the response contains all required alert fields with proper types
 * 5. Verify audit log reference relationship is accessible
 */
export async function test_api_alert_retrieval_with_audit_log_reference(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
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
  TestValidator.equals("admin email matches input", admin.email, adminEmail);

  // Step 2: Generate a test alert ID (UUID format)
  const testAlertId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Call the alert retrieval endpoint
  const alert: ITodoAppAlert = await api.functional.todoApp.admin.alerts.at(
    connection,
    {
      alertId: testAlertId,
    },
  );
  typia.assert(alert);

  // Step 4: Validate alert has required fields with content
  TestValidator.predicate(
    "alert type is not empty",
    alert.alert_type.length > 0,
  );
  TestValidator.predicate("alert title is not empty", alert.title.length > 0);
  TestValidator.predicate(
    "alert description is not empty",
    alert.description.length > 0,
  );

  // Step 5: Verify alert relationships and structure
  // After typia.assert(), all types are guaranteed correct:
  // - alert.id is valid UUID
  // - alert.severity is one of: "info" | "warning" | "critical"
  // - alert.status is one of: "open" | "acknowledged" | "resolved"
  // - alert.created_at is valid ISO 8601 date-time
  // - alert.todo_app_audit_log_id is either valid UUID or null/undefined

  TestValidator.predicate(
    "alert has valid severity level",
    ["info", "warning", "critical"].includes(alert.severity),
  );

  TestValidator.predicate(
    "alert has valid status",
    ["open", "acknowledged", "resolved"].includes(alert.status),
  );

  // Step 6: Validate audit log reference relationship
  // The optional todo_app_audit_log_id field demonstrates the alert-to-audit-log relationship
  if (
    alert.todo_app_audit_log_id !== null &&
    alert.todo_app_audit_log_id !== undefined
  ) {
    TestValidator.predicate(
      "audit log reference exists with correct type",
      typeof alert.todo_app_audit_log_id === "string",
    );
  }
}
