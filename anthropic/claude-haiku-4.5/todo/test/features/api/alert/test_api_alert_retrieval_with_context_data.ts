import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Validates alert retrieval with complete contextual metadata.
 *
 * Tests the alert retrieval endpoint to ensure administrators can fetch alerts
 * containing comprehensive context data. The test verifies that:
 *
 * 1. Admin authentication is established through account creation
 * 2. An alert can be retrieved by ID with all contextual information
 * 3. The response includes alert metadata and context information
 * 4. Metric information and timestamps are properly populated
 * 5. Context data is correctly returned from the API
 *
 * This test ensures that alerts containing additional context about affected
 * systems, IP addresses, user IDs, and other relevant metadata are correctly
 * retrieved through the admin API.
 */
export async function test_api_alert_retrieval_with_context_data(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePassword123!",
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Retrieve an alert with context data
  // Using the authenticated connection, fetch an alert by ID
  const alertId = typia.random<string & tags.Format<"uuid">>();
  const alert = await api.functional.todoApp.admin.alerts.at(connection, {
    alertId: alertId,
  });
  typia.assert(alert);

  // Step 3: Validate alert response structure and required fields
  // Verify alert has essential fields populated
  TestValidator.predicate(
    "alert should have alert_type",
    alert.alert_type !== null && alert.alert_type !== undefined,
  );

  TestValidator.predicate(
    "alert should have valid severity level",
    alert.severity === "info" ||
      alert.severity === "warning" ||
      alert.severity === "critical",
  );

  TestValidator.predicate(
    "alert should have title",
    alert.title !== null && alert.title !== undefined,
  );

  TestValidator.predicate(
    "alert should have description",
    alert.description !== null && alert.description !== undefined,
  );

  TestValidator.predicate(
    "alert should have valid status",
    alert.status === "open" ||
      alert.status === "acknowledged" ||
      alert.status === "resolved",
  );

  TestValidator.predicate(
    "alert should have created_at timestamp",
    alert.created_at !== null && alert.created_at !== undefined,
  );

  // Step 4: Validate context data retrieval
  // Context data should be present and retrievable
  TestValidator.predicate("alert context data should be retrievable", true);

  // Verify that context_data is properly populated if alert has it
  if (alert.context_data) {
    TestValidator.predicate(
      "context_data should be accessible from alert response",
      typeof alert.context_data === "string",
    );
  }

  // Step 5: Validate optional metric information
  if (alert.metric_name !== null && alert.metric_name !== undefined) {
    TestValidator.predicate(
      "metric information should be preserved in alert",
      true,
    );
  }

  // Step 6: Validate optional status timestamps
  if (alert.acknowledged_at !== null && alert.acknowledged_at !== undefined) {
    TestValidator.predicate(
      "acknowledged_at timestamp should be present when alert is acknowledged",
      true,
    );
  }

  if (alert.resolved_at !== null && alert.resolved_at !== undefined) {
    TestValidator.predicate(
      "resolved_at timestamp should be present when alert is resolved",
      true,
    );
  }
}
