import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test updating only the resolved_at timestamp when resolving an alert.
 *
 * Validates the alert resolution workflow where an administrator marks an alert
 * as resolved and the system records the exact moment of resolution. This test
 * verifies that:
 *
 * 1. Administrator account is created with valid credentials for API access
 * 2. An alert is updated with resolved status and resolved_at timestamp in ISO
 *    8601 format
 * 3. The response correctly reflects the updated alert with resolved status
 * 4. The resolved_at timestamp matches the provided UTC timestamp
 * 5. The timestamp format conforms to ISO 8601 standards
 */
export async function test_api_alert_timestamp_update_resolved_at(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authenticated alert management
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
    admin.id !== null && admin.id !== undefined,
  );

  // Step 2: Generate a test alert ID for the resolution update
  const alertId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create the resolved timestamp in ISO 8601 UTC format
  const resolvedTimestamp: string = new Date().toISOString();

  // Step 4: Update the alert with resolved status and timestamp
  const updatedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.update(connection, {
      alertId: alertId,
      body: {
        status: "resolved",
        resolved_at: resolvedTimestamp,
      } satisfies ITodoAppAlert.IUpdate,
    });
  typia.assert(updatedAlert);

  // Step 5: Validate the alert status was updated to resolved
  TestValidator.equals(
    "alert status successfully updated to resolved",
    updatedAlert.status,
    "resolved",
  );

  // Step 6: Verify resolved_at timestamp is populated
  TestValidator.predicate(
    "resolved_at timestamp is set in response",
    updatedAlert.resolved_at !== null && updatedAlert.resolved_at !== undefined,
  );

  // Step 7: Validate the resolved_at timestamp matches the provided value
  TestValidator.equals(
    "resolved_at timestamp matches the provided UTC timestamp",
    updatedAlert.resolved_at,
    resolvedTimestamp,
  );

  // Step 8: Confirm the updated alert has the correct ID
  TestValidator.equals(
    "alert ID in response matches requested alert",
    updatedAlert.id,
    alertId,
  );

  // Step 9: Verify the timestamp follows ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
  TestValidator.predicate(
    "resolved_at timestamp conforms to ISO 8601 UTC format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      updatedAlert.resolved_at ?? "",
    ),
  );
}
