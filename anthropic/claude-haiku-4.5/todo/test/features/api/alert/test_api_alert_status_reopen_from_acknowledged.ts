import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test reopening an acknowledged alert by reverting its status back to open.
 *
 * Administrator creates an alert, acknowledges it to mark it as under
 * investigation, then reopens it back to open status when new information
 * reveals the issue requires further attention. This validates the alert status
 * lifecycle and the ability to adjust alert progression when circumstances
 * change.
 *
 * Workflow:
 *
 * 1. Create administrator account for alert management
 * 2. Generate test alert data with open status
 * 3. Acknowledge the alert, recording the acknowledgment timestamp
 * 4. Reopen the alert by setting status back to open and clearing acknowledged_at
 * 5. Verify the alert status transition and timestamp clearing
 */
export async function test_api_alert_status_reopen_from_acknowledged(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Generate test alert data with open status
  const initialAlert = typia.random<ITodoAppAlert>();
  typia.assert(initialAlert);

  // 3. Acknowledge the alert with current timestamp
  const acknowledgedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: initialAlert.id,
      body: {
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
      } satisfies ITodoAppAlert.IUpdate,
    });
  typia.assert(acknowledgedAlert);

  // Verify the alert was acknowledged
  TestValidator.equals(
    "alert status is acknowledged",
    acknowledgedAlert.status,
    "acknowledged",
  );
  TestValidator.predicate(
    "acknowledged_at timestamp is set",
    acknowledgedAlert.acknowledged_at !== null &&
      acknowledgedAlert.acknowledged_at !== undefined,
  );

  // 4. Reopen the alert by reverting to open status and clearing acknowledged_at
  const reopenedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: initialAlert.id,
      body: {
        status: "open",
        acknowledged_at: null,
      } satisfies ITodoAppAlert.IUpdate,
    });
  typia.assert(reopenedAlert);

  // 5. Verify the alert status transition and timestamp clearing
  TestValidator.equals(
    "alert status is reverted to open",
    reopenedAlert.status,
    "open",
  );
  TestValidator.predicate(
    "acknowledged_at timestamp is cleared",
    reopenedAlert.acknowledged_at === null ||
      reopenedAlert.acknowledged_at === undefined,
  );
  TestValidator.equals(
    "alert ID remains unchanged",
    reopenedAlert.id,
    initialAlert.id,
  );
}
