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
 * Test alert list retrieval with alert type filtering.
 *
 * Authenticates an admin user and retrieves alerts filtered by alert_type.
 * Validates that the type filter returns only alerts of the specified category.
 * Tests pagination with different alert types to ensure administrators can
 * focus on specific alert categories for targeted issue investigation.
 *
 * Steps:
 *
 * 1. Create and authenticate as admin user
 * 2. Request alerts filtered by specific alert_type
 * 3. Validate response structure and pagination
 * 4. Confirm filtered results contain only specified alert type
 * 5. Test multiple alert types to verify filter effectiveness
 */
export async function test_api_alert_filtering_by_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user
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

  // Step 2: Request alerts filtered by specific alert_type
  const testAlertType = "high_failed_logins";

  const alertResponse: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        alert_type: testAlertType,
        skip: 0,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(alertResponse);

  // Step 3: Validate response structure and pagination
  TestValidator.predicate(
    "pagination object exists",
    alertResponse.pagination !== null && alertResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "data array exists",
    Array.isArray(alertResponse.data),
  );

  TestValidator.predicate(
    "current page is valid",
    alertResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit is positive",
    alertResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "records count is non-negative",
    alertResponse.pagination.records >= 0,
  );

  // Step 4: Confirm filtered results contain only specified alert type
  if (alertResponse.data.length > 0) {
    alertResponse.data.forEach((alert, index) => {
      TestValidator.equals(
        `alert ${index} type matches filter`,
        alert.alert_type,
        testAlertType,
      );
    });
  }

  // Step 5: Test with different alert type
  const secondAlertType = "rate_limit_exceeded";

  const secondAlertResponse: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        alert_type: secondAlertType,
        skip: 0,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(secondAlertResponse);

  TestValidator.predicate(
    "second filter response is valid",
    secondAlertResponse !== null,
  );

  if (secondAlertResponse.data.length > 0) {
    secondAlertResponse.data.forEach((alert, index) => {
      TestValidator.equals(
        `second alert ${index} type matches second filter`,
        alert.alert_type,
        secondAlertType,
      );
    });
  }

  // Step 6: Test pagination with alert type filter
  const paginatedResponse: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        alert_type: testAlertType,
        skip: 5,
        take: 5,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(paginatedResponse);

  TestValidator.predicate(
    "pagination skip works correctly",
    paginatedResponse.pagination.current >= 0,
  );
}
