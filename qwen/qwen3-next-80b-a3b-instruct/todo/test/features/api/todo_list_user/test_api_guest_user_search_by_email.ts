import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_guest_user_search_by_email(
  connection: api.IConnection,
) {
  // Step 1: Create a guest user account to establish authentication context
  const guestEmail: string = `test1@example.com`;
  const guestJoinData = {
    email: guestEmail,
    href: "https://example.com/todo",
    referrer: "https://example.com/home",
  } satisfies ITodoListGuest.IJoin;

  const guestAuth: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestJoinData,
    });
  typia.assert(guestAuth);

  // Step 2: Create a second guest user with a different email for testing search
  const secondGuestEmail: string = `test2@example.com`;
  const secondGuestJoinData = {
    email: secondGuestEmail,
    href: "https://example.com/todo",
    referrer: "https://example.com/home",
  } satisfies ITodoListGuest.IJoin;

  const secondGuestAuth: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: secondGuestJoinData,
    });
  typia.assert(secondGuestAuth);

  // Step 3: Prepare search parameters for email containing 'example.com'
  const searchRequest: ITodoListUser.IRequest = {
    search: "example.com", // Search for users with email containing 'example.com'
    page: 1, // First page
    limit: 10, // Request 10 results per page
    sort_by: "created_at", // Sort by creation date
    order: "asc", // Ascending order
  } satisfies ITodoListUser.IRequest;

  // Step 4: Perform the search operation
  const searchResult: IPageITodoListUser.ISummary =
    await api.functional.todoList.guest.todo_list_users.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 5: Validate search results
  // 5a. Verify pagination metadata
  TestValidator.equals(
    "pagination page matches requested",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records count is at least 2",
    searchResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "total pages count is at least 1",
    searchResult.pagination.pages >= 1,
  );

  // 5b. Verify results contain both guest users with 'example.com' in email
  TestValidator.equals(
    "result count matches expectations",
    searchResult.data.length,
    2,
  );

  // 5c. Verify email contains 'example.com' in all results
  for (const user of searchResult.data) {
    TestValidator.predicate(
      "user email contains 'example.com'",
      user.email.includes("example.com"),
    );
  }

  // 5d. Verify all users are active (deleted_at should be null)
  // Note: We don't have access to deleted_at in ISummary, but by default search returns only active users
  // This is consistent with the scenario description

  // 5e. Verify results are sorted by created_at in ascending order
  // Since we're creating users in sequence, the first created should have older timestamp
  if (searchResult.data.length >= 2) {
    const firstUser = searchResult.data[0];
    const secondUser = searchResult.data[1];

    // Convert string date to Date object for comparison
    const firstDate = new Date(firstUser.created_at);
    const secondDate = new Date(secondUser.created_at);

    TestValidator.predicate(
      "users are sorted by created_at in ascending order",
      firstDate <= secondDate,
    );
  }
}
