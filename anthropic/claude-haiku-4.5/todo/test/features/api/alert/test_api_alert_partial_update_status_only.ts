import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test partial update of alert status only without timestamp information.
 *
 * This test validates that administrators can update an alert's status field
 * independently without providing timestamp fields. The system correctly
 * handles partial updates where optional timestamp fields are omitted,
 * preserving any existing values and leaving null fields untouched.
 *
 * Test workflow:
 *
 * 1. Create an administrator account for authentication
 * 2. Generate alert ID and perform partial status update
 * 3. Call the alert update API with status-only update
 * 4. Verify the response structure and status change
 * 5. Validate that partial update works with timestamps as undefined
 */
export async function test_api_alert_partial_update_status_only(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "TestAdminPassword123!",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Generate alert ID for update test
  const alertId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Perform partial update with status-only change
  // The partial update request omits timestamp fields (acknowledged_at, resolved_at)
  const updateBody = {
    status: "acknowledged" as const,
  } satisfies ITodoAppAlert.IUpdate;

  const updatedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: updateBody,
    });
  typia.assert(updatedAlert);

  // Step 4: Verify the status was updated correctly
  TestValidator.equals(
    "alert status should be updated to acknowledged",
    updatedAlert.status,
    "acknowledged",
  );

  // Step 5: Validate that response has valid alert structure
  TestValidator.predicate(
    "updated alert should have valid id field",
    updatedAlert.id === alertId,
  );

  // Step 6: Test another status transition to 'resolved'
  const resolveUpdateBody = {
    status: "resolved" as const,
  } satisfies ITodoAppAlert.IUpdate;

  const resolvedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: resolveUpdateBody,
    });
  typia.assert(resolvedAlert);

  TestValidator.equals(
    "alert status should be updated to resolved",
    resolvedAlert.status,
    "resolved",
  );

  // Step 7: Test status reset to 'open' to verify bidirectional updates
  const resetUpdateBody = {
    status: "open" as const,
  } satisfies ITodoAppAlert.IUpdate;

  const resetAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: resetUpdateBody,
    });
  typia.assert(resetAlert);

  TestValidator.equals(
    "alert status should be reset to open",
    resetAlert.status,
    "open",
  );
}
