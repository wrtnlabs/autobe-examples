import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

/**
 * Validate basic paginated listing of guest users for an authenticated
 * guestUser.
 *
 * Business goals
 *
 * - Ensure a guestUser actor (obtained via POST /auth/guestUser/join) can
 *   successfully call PATCH /todoApp/guestUser/guestUsers.
 * - Verify that simple pagination parameters (page and limit) are respected and
 *   correctly reflected in the IPage.IPagination metadata.
 * - Confirm that each returned summary row structurally matches
 *   ITodoAppGuestUser.ISummary and looks reasonable for list rendering.
 *
 * Scenario steps
 *
 * 1. Call api.functional.auth.guestUser.join to obtain
 *    ITodoAppGuestUser.IAuthorized and implicitly configure the connection for
 *    authenticated guestUser requests.
 * 2. Request the first page of guest users with limit = 10 via
 *    api.functional.todoApp.guestUser.guestUsers.index, using an
 *    ITodoAppGuestUser.IRequest body with only page and limit populated.
 * 3. Assert the response type with
 *    typia.assert<IPageITodoAppGuestuser.ISummary>().
 * 4. Validate pagination metadata:
 *
 *    - Pagination.current must equal 1
 *    - Pagination.limit must equal 10
 *    - Pagination.records and pagination.pages must be non-negative integers.
 * 5. Iterate over data, asserting each element with typia.assert and checking
 *    that:
 *
 *    - Id is a non-empty string (UUID format is already guaranteed by typia)
 *    - Created_at and updated_at are non-empty strings (date-time format guaranteed
 *         by typia)
 * 6. Perform a second listing call with a different limit (e.g., 5) and verify:
 *
 *    - Pagination.limit equals the new limit
 *    - Data.length does not exceed the requested limit.
 */
export async function test_api_guest_user_list_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Join as a guest user to establish guestUser authorization context
  const authorized = await api.functional.auth.guestUser.join(connection, {
    body: {
      // display_name is optional; provide a random name for realism
      display_name: RandomGenerator.name(1),
    } satisfies ITodoAppGuestUser.IJoin,
  });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);

  // 2. Request first page with limit = 10
  const requestPage1 = {
    page: 1 satisfies number,
    limit: 10 satisfies number,
  } satisfies ITodoAppGuestUser.IRequest;

  const page1 = await api.functional.todoApp.guestUser.guestUsers.index(
    connection,
    {
      body: requestPage1,
    },
  );
  typia.assert<IPageITodoAppGuestuser.ISummary>(page1);

  const pagination1 = page1.pagination;

  // 3. Validate pagination metadata for first request
  TestValidator.equals(
    "pagination.current should equal requested page (1)",
    pagination1.current,
    requestPage1.page,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit (10)",
    pagination1.limit,
    requestPage1.limit,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    pagination1.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    pagination1.pages >= 0,
  );

  // 4. Validate each summary item structure and basic sanity
  for (const summary of page1.data) {
    typia.assert<ITodoAppGuestUser.ISummary>(summary);

    TestValidator.predicate(
      "guest user id should be non-empty string",
      summary.id.length > 0,
    );
    TestValidator.predicate(
      "guest user created_at should be non-empty string",
      summary.created_at.length > 0,
    );
    TestValidator.predicate(
      "guest user updated_at should be non-empty string",
      summary.updated_at.length > 0,
    );
  }

  // 5. Perform a second listing with different limit to confirm limit behavior
  const secondLimit = 5;
  const requestPage1Limit5 = {
    page: 1 satisfies number,
    limit: secondLimit satisfies number,
  } satisfies ITodoAppGuestUser.IRequest;

  const page1Limit5 = await api.functional.todoApp.guestUser.guestUsers.index(
    connection,
    {
      body: requestPage1Limit5,
    },
  );
  typia.assert<IPageITodoAppGuestuser.ISummary>(page1Limit5);

  const paginationLimit5 = page1Limit5.pagination;

  TestValidator.equals(
    "pagination.current should remain 1 for second request",
    paginationLimit5.current,
    requestPage1Limit5.page,
  );
  TestValidator.equals(
    "pagination.limit should reflect new limit (5)",
    paginationLimit5.limit,
    requestPage1Limit5.limit,
  );
  TestValidator.predicate(
    "data length should not exceed requested limit (5)",
    page1Limit5.data.length <= secondLimit,
  );
}
