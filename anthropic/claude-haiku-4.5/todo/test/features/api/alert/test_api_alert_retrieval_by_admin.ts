import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test successful retrieval of alert details by an authenticated administrator.
 *
 * This test validates the complete workflow of admin authentication and alert
 * retrieval:
 *
 * 1. Create an administrator account via /auth/admin/join endpoint
 * 2. Retrieve a specific alert by its ID from /todoApp/admin/alerts/{alertId}
 * 3. Verify the alert response contains all expected fields and proper structure
 * 4. Validate alert data integrity including type, severity, status, and
 *    timestamps
 *
 * The test ensures admins can access system alerts for monitoring and incident
 * investigation.
 */
export async function test_api_alert_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account via join endpoint
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const adminAuth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(adminAuth);

  TestValidator.equals(
    "admin email matches input",
    adminAuth.email,
    adminEmail,
  );

  // Step 2: Retrieve alert by ID with authenticated admin connection
  const alertId = typia.random<string & tags.Format<"uuid">>();

  const alert: ITodoAppAlert = await api.functional.todoApp.admin.alerts.at(
    connection,
    {
      alertId: alertId,
    },
  );
  typia.assert(alert);

  // Step 3: Verify alert contains complete and valid information
  // typia.assert() above already validates:
  // - All required fields are present and correctly typed
  // - id is valid UUID format
  // - alert_type is non-empty string
  // - severity is one of: "info", "warning", "critical"
  // - title and description are non-empty strings
  // - status is one of: "open", "acknowledged", "resolved"
  // - created_at is valid date-time format
  // - Optional fields have correct types when present
  // - Optional timestamps are valid date-time format when present

  TestValidator.equals(
    "retrieved alert ID matches requested ID",
    alert.id,
    alertId,
  );

  TestValidator.predicate(
    "alert has valid severity level",
    ["info", "warning", "critical"].includes(alert.severity),
  );

  TestValidator.predicate(
    "alert has valid status",
    ["open", "acknowledged", "resolved"].includes(alert.status),
  );
}
