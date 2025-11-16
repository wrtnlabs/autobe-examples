import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test that the response from an alert update operation includes all updated
 * fields with new values.
 *
 * Administrator authenticates and validates that the alert update API returns a
 * complete alert record with all fields properly updated. This test focuses on
 * the API response structure and field preservation during status transitions.
 *
 * Test Flow:
 *
 * 1. Create administrator account via POST /auth/admin/join
 * 2. Prepare alert update with status transition from 'open' to 'acknowledged'
 * 3. Call PUT /todoApp/admin/alerts/{alertId} with acknowledgment timestamp
 * 4. Validate response includes updated status and acknowledged_at timestamp
 * 5. Prepare second update transitioning to 'resolved' status
 * 6. Call PUT /todoApp/admin/alerts/{alertId} with resolution timestamp
 * 7. Validate response includes all updated fields with proper timestamps
 * 8. Verify response contains complete alert record with no data loss
 */
export async function test_api_alert_update_response_includes_updated_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for API authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(12);

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
    "admin account created with valid credentials",
    admin.id !== undefined && admin.email === adminEmail,
  );

  // Step 2: Prepare first alert update - acknowledge an alert
  const alertId: string = typia.random<string & tags.Format<"uuid">>();
  const acknowledgedAt: string = new Date().toISOString();

  const acknowledgedResponse: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: {
        status: "acknowledged",
        acknowledged_at: acknowledgedAt,
      } satisfies ITodoAppAlert.IUpdate,
    });
  typia.assert(acknowledgedResponse);

  // Step 3: Validate acknowledged response fields
  TestValidator.equals(
    "response status updated to acknowledged",
    acknowledgedResponse.status,
    "acknowledged",
  );
  TestValidator.equals(
    "response includes acknowledged_at timestamp",
    acknowledgedResponse.acknowledged_at,
    acknowledgedAt,
  );
  TestValidator.predicate(
    "response contains alert id",
    acknowledgedResponse.id !== undefined,
  );
  TestValidator.predicate(
    "response contains alert_type field",
    acknowledgedResponse.alert_type !== undefined,
  );
  TestValidator.predicate(
    "response contains severity field",
    ["info", "warning", "critical"].includes(acknowledgedResponse.severity),
  );
  TestValidator.predicate(
    "response contains title field",
    acknowledgedResponse.title !== undefined &&
      acknowledgedResponse.title.length > 0,
  );
  TestValidator.predicate(
    "response contains description field",
    acknowledgedResponse.description !== undefined &&
      acknowledgedResponse.description.length > 0,
  );
  TestValidator.predicate(
    "response contains created_at timestamp",
    acknowledgedResponse.created_at !== undefined,
  );

  // Step 4: Prepare second alert update - resolve the alert
  const resolvedAt: string = new Date().toISOString();

  const resolvedResponse: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: {
        status: "resolved",
        resolved_at: resolvedAt,
      } satisfies ITodoAppAlert.IUpdate,
    });
  typia.assert(resolvedResponse);

  // Step 5: Validate resolved response contains all updated fields
  TestValidator.equals(
    "response status updated to resolved",
    resolvedResponse.status,
    "resolved",
  );
  TestValidator.equals(
    "response includes resolved_at timestamp",
    resolvedResponse.resolved_at,
    resolvedAt,
  );

  // Step 6: Verify all original alert properties preserved through updates
  TestValidator.predicate(
    "response preserves alert id field",
    resolvedResponse.id === acknowledgedResponse.id,
  );
  TestValidator.predicate(
    "response preserves alert_type field",
    resolvedResponse.alert_type === acknowledgedResponse.alert_type,
  );
  TestValidator.predicate(
    "response preserves severity field",
    resolvedResponse.severity === acknowledgedResponse.severity,
  );
  TestValidator.predicate(
    "response preserves title field",
    resolvedResponse.title === acknowledgedResponse.title,
  );
  TestValidator.predicate(
    "response preserves description field",
    resolvedResponse.description === acknowledgedResponse.description,
  );
  TestValidator.predicate(
    "response preserves created_at timestamp",
    resolvedResponse.created_at === acknowledgedResponse.created_at,
  );

  // Step 7: Verify acknowledged_at timestamp from previous update is preserved
  TestValidator.equals(
    "response preserves previously set acknowledged_at timestamp",
    resolvedResponse.acknowledged_at,
    acknowledgedAt,
  );

  // Step 8: Final validation of complete response structure
  TestValidator.predicate(
    "final response contains all required alert fields",
    resolvedResponse.id !== undefined &&
      resolvedResponse.alert_type !== undefined &&
      resolvedResponse.severity !== undefined &&
      resolvedResponse.title !== undefined &&
      resolvedResponse.description !== undefined &&
      resolvedResponse.status === "resolved" &&
      resolvedResponse.created_at !== undefined &&
      resolvedResponse.resolved_at !== undefined,
  );
}
