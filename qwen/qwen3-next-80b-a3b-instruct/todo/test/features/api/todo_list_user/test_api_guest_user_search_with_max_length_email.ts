import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_guest_user_search_with_max_length_email(
  connection: api.IConnection,
) {
  // Step 1: Create a guest user account to establish authentication context
  const guestEmail: string = typia.random<string & tags.Format<"email">>();
  const guestHref: string = "https://example.com/todo";
  const guestReferrer: string = "https://example.com/home";

  const joinResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        href: guestHref,
        referrer: guestReferrer,
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(joinResponse);

  // Step 2: Generate a 100-character email search term (maximum allowed length)
  // The maximum length for search is 100 characters as specified in ITodoListUser.IRequest.search
  // We create a string that is exactly 100 characters long with a valid email pattern
  const maxLengthEmail =
    "abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij";

  // Step 3: Perform search with the maximum-length email term
  const searchResponse: IPageITodoListUser.ISummary =
    await api.functional.todoList.guest.todo_list_users.index(connection, {
      body: {
        search: maxLengthEmail,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(searchResponse);

  // Step 4: Validate search response
  // Verify that the response is valid and contains the expected structure
  TestValidator.equals(
    "search response pagination is valid",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "at least one page exists",
    searchResponse.pagination.pages >= 1,
  );

  // Verify the search term was processed correctly by checking if result data is returned
  TestValidator.predicate(
    "search returned at least one result",
    searchResponse.data.length > 0,
  );

  // Additional validation: Verify that one of the returned users has the search term as their email
  const foundUser = searchResponse.data.find(
    (user) => user.email === guestEmail,
  );
  TestValidator.predicate(
    "search found the user we created",
    foundUser !== undefined,
  );
}
