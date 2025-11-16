import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test retrieval of critical severity alerts by administrator.
 *
 * This test validates the workflow for an administrator to access and retrieve
 * critical severity alerts from the system. It ensures that:
 *
 * - Admin authentication is properly established through the join endpoint
 * - The alert retrieval endpoint correctly returns alert data with proper
 *   severity classification
 * - Alert response contains all required fields with accurate values
 * - Critical severity alerts are properly accessible and marked with correct
 *   classification
 *
 * The test follows a realistic admin workflow: admin authentication → alert
 * retrieval → validation. Critical severity alerts represent issues requiring
 * immediate administrator attention.
 */
export async function test_api_alert_retrieval_with_critical_severity(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and obtain authentication token
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
    "admin authentication token should be present",
    adminAuth.token.access.length > 0,
  );

  // Step 2: Generate a valid alert UUID to retrieve
  const criticalAlertId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the critical severity alert by ID
  const retrievedAlert: ITodoAppAlert =
    await api.functional.todoApp.admin.alerts.at(connection, {
      alertId: criticalAlertId,
    });
  typia.assert(retrievedAlert);

  // Step 4: Validate the retrieved alert has critical severity
  TestValidator.equals(
    "retrieved alert should have critical severity",
    retrievedAlert.severity,
    "critical",
  );
  TestValidator.predicate(
    "alert ID should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedAlert.id,
    ),
  );
  TestValidator.predicate(
    "alert title should be populated",
    retrievedAlert.title.length > 0,
  );
  TestValidator.predicate(
    "alert description should be populated",
    retrievedAlert.description.length > 0,
  );
  TestValidator.predicate(
    "alert type should be populated",
    retrievedAlert.alert_type.length > 0,
  );
  TestValidator.predicate(
    "alert created_at timestamp should be in valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      retrievedAlert.created_at,
    ),
  );
  TestValidator.predicate(
    "alert status should be one of valid values",
    retrievedAlert.status === "open" ||
      retrievedAlert.status === "acknowledged" ||
      retrievedAlert.status === "resolved",
  );
}
