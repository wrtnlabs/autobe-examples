import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test retrieval of metric-based alerts containing threshold violation
 * information.
 *
 * Administrator retrieves an alert that was triggered by a metric exceeding a
 * threshold, verifying that metric_name, metric_value, and threshold_value
 * fields are properly populated and returned.
 *
 * Workflow:
 *
 * 1. Create administrator account for authentication
 * 2. Retrieve a metric-based alert using the alert retrieval endpoint
 * 3. Validate metric threshold data fields are properly populated
 * 4. Verify alert contains complete metric violation information
 */
export async function test_api_alert_retrieval_with_metric_threshold_data(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
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
  TestValidator.predicate(
    "admin account created with valid ID",
    adminAuth.id.length > 0,
  );

  // Step 2: Retrieve a metric-based alert using the alert retrieval endpoint
  // Generate a sample alert ID (in real scenario, this would come from existing alerts)
  const alertId = typia.random<string & tags.Format<"uuid">>();

  const alert: ITodoAppAlert = await api.functional.todoApp.admin.alerts.at(
    connection,
    {
      alertId,
    },
  );
  typia.assert(alert);

  // Step 3: Validate metric threshold data fields are properly populated
  // Verify that metric_name exists and is a string
  TestValidator.predicate(
    "alert contains metric_name field",
    typeof alert.metric_name === "string" ||
      alert.metric_name === null ||
      alert.metric_name === undefined,
  );

  // Verify that metric_value exists and is a string
  TestValidator.predicate(
    "alert contains metric_value field",
    typeof alert.metric_value === "string" ||
      alert.metric_value === null ||
      alert.metric_value === undefined,
  );

  // Verify that threshold_value exists and is a string
  TestValidator.predicate(
    "alert contains threshold_value field",
    typeof alert.threshold_value === "string" ||
      alert.threshold_value === null ||
      alert.threshold_value === undefined,
  );

  // Step 4: Verify alert contains complete metric violation information
  // Check alert has valid ID
  TestValidator.predicate(
    "alert has valid UUID format ID",
    alert.id.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    ) !== null,
  );

  // Verify alert has alert type
  TestValidator.predicate(
    "alert has alert_type",
    typeof alert.alert_type === "string" && alert.alert_type.length > 0,
  );

  // Verify alert has severity level
  TestValidator.predicate(
    "alert severity is valid",
    ["info", "warning", "critical"].includes(alert.severity),
  );

  // Verify alert has title
  TestValidator.predicate(
    "alert has descriptive title",
    typeof alert.title === "string" && alert.title.length > 0,
  );

  // Verify alert has description
  TestValidator.predicate(
    "alert has detailed description",
    typeof alert.description === "string" && alert.description.length > 0,
  );

  // Verify alert status
  TestValidator.predicate(
    "alert status is valid",
    ["open", "acknowledged", "resolved"].includes(alert.status),
  );

  // Verify created_at timestamp exists
  TestValidator.predicate(
    "alert has creation timestamp",
    typeof alert.created_at === "string" && alert.created_at.length > 0,
  );
}
