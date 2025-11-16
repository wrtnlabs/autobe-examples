import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Validate the retrieval of resolved alerts by administrator.
 *
 * Administrator retrieves an alert to verify the alert retrieval endpoint
 * returns complete alert information. Since alert creation/state transition
 * APIs are not available, this test focuses on validating the retrieval
 * endpoint functionality with alert data that includes resolved status.
 *
 * Test steps:
 *
 * 1. Administrator authentication
 * 2. Retrieve an alert by ID
 * 3. Validate alert structure and required fields
 * 4. Verify alert response includes all documented properties
 */
export async function test_api_alert_retrieval_resolved_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestAdminPassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(admin);

  // Verify admin was created with valid authentication
  TestValidator.predicate(
    "admin account created successfully",
    admin.id !== null && admin.id !== undefined,
  );

  TestValidator.predicate(
    "admin has access token",
    admin.token.access !== null && admin.token.access !== undefined,
  );

  // Step 2: Retrieve an alert by ID
  const alertId = typia.random<string & tags.Format<"uuid">>();

  const alert = await api.functional.todoApp.admin.alerts.at(connection, {
    alertId: alertId,
  });
  typia.assert(alert);

  // Step 3: Validate alert structure and core properties
  TestValidator.predicate(
    "alert has valid UUID identifier",
    alert.id !== null &&
      alert.id !== undefined &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        alert.id,
      ),
  );

  TestValidator.predicate(
    "alert has alert type classification",
    alert.alert_type !== null &&
      alert.alert_type !== undefined &&
      alert.alert_type.length > 0,
  );

  TestValidator.predicate(
    "alert has valid severity level",
    ["info", "warning", "critical"].includes(alert.severity),
  );

  TestValidator.predicate(
    "alert has title",
    alert.title !== null && alert.title !== undefined && alert.title.length > 0,
  );

  TestValidator.predicate(
    "alert has description",
    alert.description !== null &&
      alert.description !== undefined &&
      alert.description.length > 0,
  );

  // Step 4: Verify alert has creation timestamp
  TestValidator.predicate(
    "alert has creation timestamp",
    alert.created_at !== null && alert.created_at !== undefined,
  );

  // Step 5: Verify alert status is valid
  TestValidator.predicate(
    "alert has valid status",
    ["open", "acknowledged", "resolved"].includes(alert.status),
  );

  // Step 6: If alert is resolved, verify resolved_at timestamp
  if (alert.status === "resolved") {
    TestValidator.predicate(
      "resolved alert has resolved_at timestamp",
      alert.resolved_at !== null && alert.resolved_at !== undefined,
    );
  }

  // Step 7: If alert is acknowledged or resolved, verify acknowledged_at timestamp
  if (alert.status === "acknowledged" || alert.status === "resolved") {
    TestValidator.predicate(
      "acknowledged/resolved alert has acknowledged_at timestamp",
      alert.acknowledged_at !== null && alert.acknowledged_at !== undefined,
    );
  }

  // Step 8: Validate timestamp chronological ordering when multiple states exist
  if (
    alert.acknowledged_at !== null &&
    alert.acknowledged_at !== undefined &&
    alert.resolved_at !== null &&
    alert.resolved_at !== undefined
  ) {
    const acknowledgedTime = new Date(alert.acknowledged_at).getTime();
    const resolvedTime = new Date(alert.resolved_at).getTime();

    TestValidator.predicate(
      "acknowledged timestamp occurs before resolution timestamp",
      acknowledgedTime <= resolvedTime,
    );
  }

  // Step 9: Validate optional metric fields if present
  if (alert.metric_name !== null && alert.metric_name !== undefined) {
    TestValidator.predicate(
      "metric name is populated when alert is metric-based",
      alert.metric_name.length > 0,
    );
  }

  // Step 10: Confirm alert retrieval returns complete response structure
  TestValidator.predicate(
    "alert response is complete with all core fields",
    alert.id !== null &&
      alert.alert_type !== null &&
      alert.severity !== null &&
      alert.title !== null &&
      alert.description !== null &&
      alert.status !== null &&
      alert.created_at !== null,
  );
}
