import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_guest_user_search_with_whitespace_email(
  connection: api.IConnection,
) {
  // Step 1: Create guest user account with minimal valid data for authentication context
  const guestEmail: string = typia.random<string & tags.Format<"email">>();
  const guestJoin: ITodoListGuest.IJoin = {
    email: guestEmail,
    href: "https://example.com",
    referrer: "https://example.com/home",
  };

  const guestAuth: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestJoin satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guestAuth);

  // Step 2: Search for users with whitespace in email search term
  // The scenario requires searching for '  example.com  ' with surrounding whitespace
  const searchEmail: string = "  " + guestEmail + "  "; // Add leading and trailing whitespace

  const searchResult: IPageITodoListUser.ISummary =
    await api.functional.todoList.guest.todo_list_users.index(connection, {
      body: {
        search: searchEmail, // Without tags.Format<"email"> - letting API handle trimming and validation
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(searchResult);

  // Step 3: Validate successful search results
  // Verify that we found exactly one user matching the search term
  TestValidator.equals("found exactly one user", searchResult.data.length, 1);

  // Verify that the returned user's email matches the original email (without whitespace)
  TestValidator.equals(
    "search result email matches",
    searchResult.data[0].email,
    guestEmail,
  );

  // Verify that pagination info is correct
  TestValidator.equals("page 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit 25", searchResult.pagination.limit, 25);
  TestValidator.equals("total records 1", searchResult.pagination.records, 1);
  TestValidator.equals("total pages 1", searchResult.pagination.pages, 1);
}
