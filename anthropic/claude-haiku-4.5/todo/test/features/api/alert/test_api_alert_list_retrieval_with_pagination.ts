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
 * Test successful retrieval of system alerts with pagination support.
 *
 * Validates the alert list management functionality for administrators:
 *
 * 1. Admin registration and authentication
 * 2. Paginated alert retrieval with skip/take parameters
 * 3. Pagination metadata validation (current page, limit, total records, pages)
 * 4. Alert summary data structure validation
 * 5. Multiple pagination scenarios to ensure offset-based pagination works
 *    correctly
 */
export async function test_api_alert_list_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email matches registration",
    adminAuth.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin has valid access token",
    adminAuth.token.access.length > 0,
  );

  // Step 2: Retrieve first page of alerts with pagination
  const firstPageResponse: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        skip: 0,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(firstPageResponse);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination metadata exists in response",
    firstPageResponse.pagination !== null &&
      firstPageResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "first page current page is 0",
    firstPageResponse.pagination.current,
    0,
  );
  TestValidator.equals(
    "first page limit is 10",
    firstPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records is non-negative",
    firstPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    firstPageResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(firstPageResponse.data),
  );

  // Validate alert data structure if alerts exist
  if (firstPageResponse.data && firstPageResponse.data.length > 0) {
    const firstAlert = firstPageResponse.data[0];
    typia.assert(firstAlert);

    TestValidator.predicate(
      "alert has id field",
      firstAlert.id !== null && firstAlert.id !== undefined,
    );
    TestValidator.predicate(
      "alert has alert_type field",
      firstAlert.alert_type !== null && firstAlert.alert_type !== undefined,
    );
    TestValidator.predicate(
      "alert has severity field",
      firstAlert.severity !== null && firstAlert.severity !== undefined,
    );
    TestValidator.predicate(
      "alert has title field",
      firstAlert.title !== null && firstAlert.title !== undefined,
    );
    TestValidator.predicate(
      "alert has status field",
      firstAlert.status !== null && firstAlert.status !== undefined,
    );
    TestValidator.predicate(
      "alert has created_at field",
      firstAlert.created_at !== null && firstAlert.created_at !== undefined,
    );
  }

  // Step 3: Retrieve second page with skip/take pagination
  const secondPageResponse: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        skip: 10,
        take: 10,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(secondPageResponse);

  TestValidator.equals(
    "second page current page is 1",
    secondPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "second page has same limit",
    secondPageResponse.pagination.limit,
    10,
  );

  // Step 4: Retrieve with different take parameter
  const customTakeResponse: IPageITodoAppAlert.ISummary =
    await api.functional.todoApp.admin.alerts.index(connection, {
      body: {
        skip: 0,
        take: 5,
      } satisfies ITodoAppAlert.IRequest,
    });
  typia.assert(customTakeResponse);

  TestValidator.equals(
    "custom take parameter respected",
    customTakeResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "response data respects take limit",
    customTakeResponse.data.length <= 5,
  );

  // Step 5: Verify pagination calculations
  if (customTakeResponse.pagination.records > 0) {
    TestValidator.predicate(
      "pages field is consistent with records and limit",
      customTakeResponse.pagination.pages > 0,
    );
    TestValidator.predicate(
      "data length does not exceed limit",
      customTakeResponse.data.length <= customTakeResponse.pagination.limit,
    );
  }
}
