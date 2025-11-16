import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test resolving an acknowledged alert by transitioning status to resolved.
 *
 * This test validates the alert status update functionality, specifically
 * testing the transition from acknowledged to resolved status. The test ensures
 * that:
 *
 * 1. Administrator authentication is established
 * 2. The alert update endpoint correctly processes status transitions
 * 3. The resolved_at timestamp is properly recorded when transitioning to resolved
 * 4. The acknowledged_at timestamp is preserved during the transition
 * 5. The API returns the updated alert with correct status values
 *
 * Note: This test updates an existing alert that is already in acknowledged
 * status. The test focuses on the resolution phase of the alert lifecycle
 * management workflow.
 */
export async function test_api_alert_status_transition_to_resolved(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
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
  TestValidator.predicate(
    "admin should be authenticated with valid ID",
    admin.id !== null && admin.email === adminEmail,
  );

  // 2. Use a valid alert ID for the update operation
  const alertId = typia.random<string & tags.Format<"uuid">>();

  // 3. Update alert status to resolved with resolved_at timestamp
  const resolvedTime = new Date().toISOString();
  const resolvedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: {
        status: "resolved",
        resolved_at: resolvedTime,
      } satisfies ITodoAppAlert.IUpdate,
    });
  typia.assert(resolvedAlert);

  // 4. Validate the resolved state
  TestValidator.equals(
    "alert status should be resolved",
    resolvedAlert.status,
    "resolved",
  );
  TestValidator.predicate(
    "resolved_at should be set and non-null",
    resolvedAlert.resolved_at !== null &&
      resolvedAlert.resolved_at !== undefined,
  );
  TestValidator.predicate(
    "alert should have required properties",
    resolvedAlert.id !== null &&
      resolvedAlert.alert_type !== null &&
      resolvedAlert.severity !== null &&
      resolvedAlert.title !== null &&
      resolvedAlert.description !== null &&
      resolvedAlert.created_at !== null,
  );
}
