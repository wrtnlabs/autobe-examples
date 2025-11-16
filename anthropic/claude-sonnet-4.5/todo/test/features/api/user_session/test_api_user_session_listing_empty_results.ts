import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test the session listing behavior when no sessions match the filter criteria.
 *
 * This test validates that the session listing endpoint correctly handles empty
 * result scenarios, ensuring the API maintains consistent response structure
 * and provides clear feedback when no sessions match the specified criteria.
 *
 * Test Flow:
 *
 * 1. Create a new user account (which creates one initial session)
 * 2. Query sessions with IP address filter that matches no sessions
 * 3. Verify the response returns empty data array with correct pagination
 * 4. Query sessions with future date range that contains no sessions
 * 5. Verify empty results with proper pagination metadata
 * 6. Request pages beyond available data to test edge cases
 * 7. Validate all responses maintain proper structure even with no results
 */
export async function test_api_user_session_listing_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with initial session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const initialHref = typia.random<string & tags.Format<"uri">>();
  const initialReferrer = typia.random<string & tags.Format<"uri">>();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: initialHref,
      referrer: initialReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Query sessions with non-matching IP address filter
  const nonMatchingIp = "255.255.255.255";
  const emptyIpResult = await api.functional.todoList.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 20,
        ip: nonMatchingIp,
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(emptyIpResult);

  // Step 3: Validate empty result structure for IP filter
  TestValidator.equals("empty IP filter data array", emptyIpResult.data, []);
  TestValidator.equals(
    "empty IP filter records count",
    emptyIpResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty IP filter pages count",
    emptyIpResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty IP filter current page",
    emptyIpResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty IP filter limit",
    emptyIpResult.pagination.limit,
    20,
  );

  // Step 4: Query sessions with future date range (no sessions in future)
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyDateResult =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        created_after: futureDate,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(emptyDateResult);

  // Step 5: Validate empty result structure for date filter
  TestValidator.equals(
    "empty date filter data array",
    emptyDateResult.data,
    [],
  );
  TestValidator.equals(
    "empty date filter records count",
    emptyDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty date filter pages count",
    emptyDateResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty date filter current page",
    emptyDateResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty date filter limit",
    emptyDateResult.pagination.limit,
    10,
  );

  // Step 6: Test requesting page beyond available data
  const beyondPageResult =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 10,
        limit: 20,
        ip: nonMatchingIp,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(beyondPageResult);

  // Step 7: Validate empty result for page beyond data
  TestValidator.equals("beyond page data array", beyondPageResult.data, []);
  TestValidator.equals(
    "beyond page records count",
    beyondPageResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "beyond page pages count",
    beyondPageResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "beyond page current page",
    beyondPageResult.pagination.current,
    10,
  );
  TestValidator.equals(
    "beyond page limit",
    beyondPageResult.pagination.limit,
    20,
  );

  // Step 8: Test with combined filters that match nothing
  const pastDate = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const veryPastDate = new Date(
    Date.now() - 730 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const combinedFilterResult =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 50,
        created_after: veryPastDate,
        created_before: pastDate,
        ip: "192.168.1.1",
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(combinedFilterResult);

  // Step 9: Validate combined filter empty results
  TestValidator.equals(
    "combined filter data array",
    combinedFilterResult.data,
    [],
  );
  TestValidator.equals(
    "combined filter records count",
    combinedFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filter pages count",
    combinedFilterResult.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "combined filter limit is correct",
    combinedFilterResult.pagination.limit === 50,
  );
}
