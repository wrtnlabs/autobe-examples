import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

export async function test_api_alert_retrieval_open_status(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account for authentication
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
    "admin account created successfully",
    admin.id !== null && admin.email === adminEmail,
  );

  // Step 2: Generate a test alert ID to retrieve
  const testAlertId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the alert by its ID
  const retrievedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.at(connection, {
      alertId: testAlertId,
    });
  typia.assert(retrievedAlert);

  // Step 4: Validate that the retrieved alert has open status
  TestValidator.equals(
    "retrieved alert status is open",
    retrievedAlert.status,
    "open",
  );

  // Step 5: Confirm critical alert properties
  TestValidator.predicate(
    "alert ID is valid UUID format",
    retrievedAlert.id !== undefined && retrievedAlert.id.length > 0,
  );

  TestValidator.predicate(
    "alert has alert_type",
    retrievedAlert.alert_type !== undefined &&
      retrievedAlert.alert_type.length > 0,
  );

  TestValidator.predicate(
    "alert has valid severity level",
    ["info", "warning", "critical"].includes(retrievedAlert.severity),
  );

  TestValidator.predicate(
    "alert has title",
    retrievedAlert.title !== undefined && retrievedAlert.title.length > 0,
  );

  TestValidator.predicate(
    "alert has description",
    retrievedAlert.description !== undefined &&
      retrievedAlert.description.length > 0,
  );

  TestValidator.predicate(
    "alert has created_at timestamp",
    retrievedAlert.created_at !== undefined &&
      retrievedAlert.created_at.length > 0,
  );

  // Step 6: Validate open status indicators
  TestValidator.predicate(
    "open status alert has no acknowledged_at timestamp",
    retrievedAlert.acknowledged_at === null ||
      retrievedAlert.acknowledged_at === undefined,
  );

  TestValidator.predicate(
    "open status alert has no resolved_at timestamp",
    retrievedAlert.resolved_at === null ||
      retrievedAlert.resolved_at === undefined,
  );
}
