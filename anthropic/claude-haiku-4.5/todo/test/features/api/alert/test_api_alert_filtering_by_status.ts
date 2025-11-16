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
 * Test alert list retrieval with status filtering.
 *
 * This test validates the alert status filtering functionality by:
 *
 * 1. Creating an admin account for authentication
 * 2. Retrieving alerts filtered by "open" status
 * 3. Validating that the response contains only open alerts
 * 4. Retrieving alerts filtered by "acknowledged" status
 * 5. Validating that the response contains only acknowledged alerts
 * 6. Retrieving alerts filtered by "resolved" status
 * 7. Validating that the response contains only resolved alerts
 *
 * This ensures administrators can effectively filter alerts by their current
 * status to monitor system issues at different stages of resolution.
 */
export async function test_api_alert_filtering_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(16);

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

  // Step 2: Retrieve alerts filtered by "open" status
  const openAlertsPage: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        status: "open",
        skip: 0,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(openAlertsPage);

  // Step 3: Validate that all returned alerts have "open" status
  TestValidator.predicate("all open alerts should have open status", () =>
    openAlertsPage.data.every((alert) => alert.status === "open"),
  );

  // Step 4: Retrieve alerts filtered by "acknowledged" status
  const acknowledgedAlertsPage: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        status: "acknowledged",
        skip: 0,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(acknowledgedAlertsPage);

  // Step 5: Validate that all returned alerts have "acknowledged" status
  TestValidator.predicate(
    "all acknowledged alerts should have acknowledged status",
    () =>
      acknowledgedAlertsPage.data.every(
        (alert) => alert.status === "acknowledged",
      ),
  );

  // Step 6: Retrieve alerts filtered by "resolved" status
  const resolvedAlertsPage: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        status: "resolved",
        skip: 0,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(resolvedAlertsPage);

  // Step 7: Validate that all returned alerts have "resolved" status
  TestValidator.predicate(
    "all resolved alerts should have resolved status",
    () => resolvedAlertsPage.data.every((alert) => alert.status === "resolved"),
  );

  // Step 8: Validate pagination information is present
  TestValidator.predicate(
    "pagination information should be present for open alerts",
    () =>
      openAlertsPage.pagination !== null &&
      openAlertsPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination information should be present for acknowledged alerts",
    () =>
      acknowledgedAlertsPage.pagination !== null &&
      acknowledgedAlertsPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination information should be present for resolved alerts",
    () =>
      resolvedAlertsPage.pagination !== null &&
      resolvedAlertsPage.pagination !== undefined,
  );
}
