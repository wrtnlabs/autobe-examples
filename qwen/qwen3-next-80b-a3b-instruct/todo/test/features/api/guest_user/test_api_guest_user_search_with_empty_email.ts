import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_guest_user_search_with_empty_email(
  connection: api.IConnection,
) {
  // Step 1: Create guest user account to establish authentication context
  const guestUser: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/todo",
        referrer: "https://example.com",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guestUser);

  // Step 2: Perform search with empty email search term (search="")
  // Verify that empty search returns all active user accounts
  const searchResult: IPageITodoListUser.ISummary =
    await api.functional.todoList.guest.todo_list_users.index(connection, {
      body: {
        search: "",
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(searchResult);

  // Step 3: Validate that search returned at least one result (the guest user just created)
  TestValidator.predicate(
    "search with empty email returns at least one user",
    searchResult.data.length >= 1,
  );

  // Step 4: Verify the returned user matches the created guest user
  const createdUser = searchResult.data.find(
    (user) => user.email === guestUser.email,
  );
  TestValidator.predicate(
    "created guest user appears in search results",
    createdUser !== undefined,
  );
}
