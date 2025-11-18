import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_guest_user_search_with_missing_pagination(
  connection: api.IConnection,
) {
  const guestEmail: string = typia.random<string & tags.Format<"email">>();
  const joinResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        href: "https://example.com/todo",
        referrer: "https://example.com/home",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(joinResponse);

  const searchResponse: IPageITodoListUser.ISummary =
    await api.functional.todoList.guest.todo_list_users.index(connection, {
      body: {
        search: guestEmail,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(searchResponse);

  // Validate pagination defaults
  TestValidator.equals(
    "default page is 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 25",
    searchResponse.pagination.limit,
    25,
  );

  // Verify response contains at least one user with matching email
  TestValidator.predicate("response has users", searchResponse.data.length > 0);
  TestValidator.predicate(
    "first user has matching email",
    searchResponse.data[0].email === guestEmail,
  );
}
