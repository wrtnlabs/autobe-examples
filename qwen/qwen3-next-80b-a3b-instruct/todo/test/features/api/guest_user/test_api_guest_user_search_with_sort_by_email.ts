import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_guest_user_search_with_sort_by_email(
  connection: api.IConnection,
) {
  // Step 1: Create two guest users with distinct email addresses for testing
  const firstGuestEmail = typia.random<string & tags.Format<"email">>();
  const secondGuestEmail = typia.random<string & tags.Format<"email">>();

  // Ensure emails are sorted alphabetically for verification
  const sortedEmails = [firstGuestEmail, secondGuestEmail].sort();
  const firstEmail = sortedEmails[0];
  const secondEmail = sortedEmails[1];

  // Create first guest user
  const firstGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: firstEmail,
        href: "https://example.com/home",
        referrer: "https://example.com",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(firstGuest);

  // Create second guest user
  const secondGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: secondEmail,
        href: "https://example.com/home",
        referrer: "https://example.com",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(secondGuest);

  // Step 2: Perform search with sort_by=email and order=asc
  const searchResults: IPageITodoListUser.ISummary =
    await api.functional.todoList.guest.todo_list_users.index(connection, {
      body: {
        sort_by: "email", // Sort by email field
        order: "asc", // Ascending order (A to Z)
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(searchResults);

  // Step 3: Validate sorting order
  TestValidator.equals(
    "search results should be sorted by email in ascending order",
    searchResults.data[0].email,
    firstEmail,
  );
  TestValidator.equals(
    "second search result should match second email",
    searchResults.data[1].email,
    secondEmail,
  );

  // Step 4: Confirm total count matches created users
  TestValidator.equals(
    "total users should match created guest users",
    searchResults.pagination.records,
    2,
  );

  // Step 5: Verify pagination is correct
  TestValidator.equals(
    "pagination limit should be default (25)",
    searchResults.pagination.limit,
    25,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages should be 1",
    searchResults.pagination.pages,
    1,
  );
}
