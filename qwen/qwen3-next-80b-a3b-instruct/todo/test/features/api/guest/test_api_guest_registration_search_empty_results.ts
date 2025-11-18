import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

const guestEmail: string = typia.random<string & tags.Format<"email">>();
const nonExistentEmail: string = typia.random<string & tags.Format<"email">>();

/**
 * Test the search functionality with a search term that produces zero matching
 * results.
 *
 * This verifies that the system correctly returns an empty dataset without
 * errors, properly handles pagination in an empty context, and provides
 * accurate pagination metadata (current page, total records, total pages) when
 * no results are found.
 *
 * 1. Authenticate as a guest to establish the necessary authorization context via
 *    the /auth/guest/join endpoint.
 * 2. Execute the /todoList/guest/todo-list-guests search endpoint using a search
 *    term that is guaranteed to return no results (a unique, non-existent
 *    email).
 * 3. Validate the response has an empty data array and the pagination metadata
 *    accurately reflects zero records with the requested page and limit.
 *
 * This test ensures the system correctly handles zero-result search scenarios
 * without returning errors or malformed responses, confirming it properly
 * composes pagination data even when no records match the query.
 */
export async function test_api_guest_registration_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as guest to establish authorization context
  const guest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        href: "https://example.com/signup",
        referrer: "https://example.com/home",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guest);

  // Step 2: Search for a non-existent email address to produce empty results
  const searchResult: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: {
        page: 1,
        limit: 10,
        search: nonExistentEmail, // Search for a non-existent email address
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(searchResult);

  // Step 3: Validate empty results with proper pagination
  TestValidator.equals(
    "data array should be empty",
    searchResult.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", searchResult.pagination.limit, 10);
  TestValidator.equals(
    "total records should be 0",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    searchResult.pagination.pages,
    0,
  );
}
