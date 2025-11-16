import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test session search behavior when no sessions match the search criteria.
 * Validates proper handling of empty result sets with appropriate pagination
 * information, ensuring users receive meaningful feedback when no applicable
 * sessions are found.
 *
 * 1. Create a new user account to ensure clean session history
 * 2. Authenticate the user to establish session context
 * 3. Search for sessions with filters that guarantee no results
 * 4. Validate that empty results are properly returned with pagination info
 * 5. Test multiple search scenarios with various filter combinations
 */
export async function test_api_user_session_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account with authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinRequestBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: "192.168.1.100", // Valid IPv4 address
    href: "https://todoapp.example.com/join",
    referrer: "https://todoapp.example.com/login",
  } satisfies ITodoAppUser.IJoin;

  const authorizedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinRequestBody });
  typia.assert(authorizedUser);

  // Step 2: Authenticate the user (connection is automatically authorized from join)
  // Now we have an authenticated user with session context

  // Step 3: Search for sessions with filters that guarantee no results
  // Using future date range to ensure no sessions match
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const futureDateEnd = new Date(Date.now() + 172800000).toISOString(); // Day after tomorrow

  const searchRequestBody1 = {
    page: 1,
    limit: 10,
    created_at_start: futureDate,
    created_at_end: futureDateEnd,
  } satisfies ITodoAppUserSession.IRequest;

  const emptyResult1: IPageITodoAppUserSession =
    await api.functional.todoApp.user.auth.sessions.index(connection, {
      body: searchRequestBody1,
    });
  typia.assert(emptyResult1);

  // Step 4: Validate empty results with proper pagination information
  TestValidator.equals(
    "empty result should have no sessions",
    emptyResult1.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show page 1",
    emptyResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should be empty",
    emptyResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    emptyResult1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "limit should be respected",
    emptyResult1.pagination.limit,
    10,
  );

  // Step 5: Test multiple filter combinations that return no results

  // Filter 2: Search for expired sessions when user just joined (no expired sessions)
  const searchRequestBody2 = {
    page: 1,
    limit: 5,
    expired_at: true,
  } satisfies ITodoAppUserSession.IRequest;

  const emptyResult2: IPageITodoAppUserSession =
    await api.functional.todoApp.user.auth.sessions.index(connection, {
      body: searchRequestBody2,
    });
  typia.assert(emptyResult2);

  TestValidator.equals(
    "expired sessions search should be empty",
    emptyResult2.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should handle empty expired search",
    emptyResult2.pagination.records,
    0,
  );

  // Filter 3: Combination of expired false with future dates (impossible scenario)
  const searchRequestBody3 = {
    page: 1,
    limit: 20,
    created_at_start: futureDate,
    expired_at: false,
  } satisfies ITodoAppUserSession.IRequest;

  const emptyResult3: IPageITodoAppUserSession =
    await api.functional.todoApp.user.auth.sessions.index(connection, {
      body: searchRequestBody3,
    });
  typia.assert(emptyResult3);

  TestValidator.equals(
    "impossible filter combo should be empty",
    emptyResult3.data.length,
    0,
  );
  TestValidator.equals(
    "pagination with impossible filters should be empty",
    emptyResult3.pagination.records,
    0,
  );
  TestValidator.equals(
    "limit should be respected in impossible scenario",
    emptyResult3.pagination.limit,
    20,
  );

  // Step 6: Test pagination edge cases with empty results
  const searchRequestBody4 = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<5>>(),
    limit: 1,
  } satisfies ITodoAppUserSession.IRequest;

  const emptyResult4: IPageITodoAppUserSession =
    await api.functional.todoApp.user.auth.sessions.index(connection, {
      body: searchRequestBody4,
    });
  typia.assert(emptyResult4);

  TestValidator.equals(
    "high page number should be empty",
    emptyResult4.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show empty on high page",
    emptyResult4.pagination.records,
    0,
  );
  TestValidator.equals(
    "limit should be 1 even if empty",
    emptyResult4.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination current page should be > 0",
    emptyResult4.pagination.current > 0,
  );
}
