import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAlert";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAlert";

/**
 * Test alert list retrieval with severity level filtering.
 *
 * This test validates that administrators can filter alerts by severity level
 * (info, warning, or critical) and receive correctly paginated results
 * containing only alerts matching the specified severity. The test
 * authenticates an admin user, performs multiple filtered queries with
 * different severity levels, and validates that the API returns appropriate
 * alert summaries with correct filtering applied.
 *
 * Steps:
 *
 * 1. Register and authenticate admin user
 * 2. Query alerts filtered by "critical" severity
 * 3. Validate critical severity alerts are returned
 * 4. Query alerts filtered by "warning" severity
 * 5. Validate warning severity alerts are returned
 * 6. Query alerts filtered by "info" severity
 * 7. Validate info severity alerts are returned
 * 8. Query without severity filter to verify all alerts
 * 9. Validate pagination information is correct
 */
export async function test_api_alert_filtering_by_severity(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

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
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // Step 2: Query alerts filtered by "critical" severity
  const criticalResponse: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        severity: "critical",
        skip: 0,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(criticalResponse);

  // Step 3: Validate critical severity alerts are returned
  if (criticalResponse.data.length > 0) {
    for (const alert of criticalResponse.data) {
      TestValidator.equals(
        "alert severity should be critical",
        alert.severity,
        "critical",
      );
    }
  }

  // Step 4: Query alerts filtered by "warning" severity
  const warningResponse: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        severity: "warning",
        skip: 0,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(warningResponse);

  // Step 5: Validate warning severity alerts are returned
  if (warningResponse.data.length > 0) {
    for (const alert of warningResponse.data) {
      TestValidator.equals(
        "alert severity should be warning",
        alert.severity,
        "warning",
      );
    }
  }

  // Step 6: Query alerts filtered by "info" severity
  const infoResponse: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        severity: "info",
        skip: 0,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(infoResponse);

  // Step 7: Validate info severity alerts are returned
  if (infoResponse.data.length > 0) {
    for (const alert of infoResponse.data) {
      TestValidator.equals(
        "alert severity should be info",
        alert.severity,
        "info",
      );
    }
  }

  // Step 8: Query without severity filter to verify all alerts
  const allAlertsResponse: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        skip: 0,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(allAlertsResponse);

  // Step 9: Validate pagination information is correct
  TestValidator.predicate(
    "pagination current page should be non-negative",
    allAlertsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    allAlertsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    allAlertsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    allAlertsResponse.pagination.pages >= 0,
  );

  // Validate that filtered results are subset of all alerts (in terms of severity filtering)
  TestValidator.predicate(
    "critical alerts count should not exceed total alerts",
    criticalResponse.data.length <= allAlertsResponse.data.length,
  );
}
