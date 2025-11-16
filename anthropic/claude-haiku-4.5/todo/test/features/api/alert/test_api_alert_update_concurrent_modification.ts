import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test updating the same alert multiple times in sequence to verify proper
 * handling of concurrent or rapid updates.
 *
 * Administrator performs sequential updates to an alert status, validating that
 * each update properly modifies the alert and subsequent updates see the
 * previous changes.
 *
 * Process:
 *
 * 1. Register administrator account
 * 2. Generate test alert ID and timestamps
 * 3. Update alert from 'open' to 'acknowledged' status
 * 4. Verify acknowledged_at timestamp is recorded
 * 5. Update alert from 'acknowledged' to 'resolved' status
 * 6. Verify resolved_at timestamp is recorded
 * 7. Validate final state maintains all modifications
 */
export async function test_api_alert_update_concurrent_modification(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account for accessing alert management endpoints
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(10);

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

  // Step 2: Generate test alert ID and timestamps for sequential updates
  const alertId: string = typia.random<string & tags.Format<"uuid">>();
  const acknowledgedTime: string = new Date().toISOString();
  const resolvedTime: string = new Date(Date.now() + 1000).toISOString();

  // Step 3: First update - transition alert from 'open' to 'acknowledged' status
  const firstUpdate: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: {
        status: "acknowledged",
        acknowledged_at: acknowledgedTime,
      } satisfies ITodoAppAlert.IUpdate,
    });
  typia.assert(firstUpdate);
  TestValidator.equals(
    "first update sets status to acknowledged",
    firstUpdate.status,
    "acknowledged",
  );
  TestValidator.equals(
    "first update records acknowledged_at timestamp",
    firstUpdate.acknowledged_at,
    acknowledgedTime,
  );

  // Step 4: Second update - transition alert from 'acknowledged' to 'resolved' status
  const secondUpdate: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: {
        status: "resolved",
        acknowledged_at: firstUpdate.acknowledged_at,
        resolved_at: resolvedTime,
      } satisfies ITodoAppAlert.IUpdate,
    });
  typia.assert(secondUpdate);
  TestValidator.equals(
    "second update sets status to resolved",
    secondUpdate.status,
    "resolved",
  );
  TestValidator.equals(
    "second update preserves acknowledged_at from first update",
    secondUpdate.acknowledged_at,
    firstUpdate.acknowledged_at,
  );
  TestValidator.equals(
    "second update records resolved_at timestamp",
    secondUpdate.resolved_at,
    resolvedTime,
  );

  // Step 5: Verify data integrity across sequential modifications
  TestValidator.equals(
    "final state has correct alert ID",
    secondUpdate.id,
    alertId,
  );
  TestValidator.predicate(
    "alert status is resolved after sequential updates",
    secondUpdate.status === "resolved",
  );
  TestValidator.predicate(
    "acknowledged and resolved timestamps are distinct",
    secondUpdate.acknowledged_at !== secondUpdate.resolved_at,
  );
}
