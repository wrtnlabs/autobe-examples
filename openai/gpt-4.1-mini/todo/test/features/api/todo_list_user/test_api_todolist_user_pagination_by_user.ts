import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * This test performs the following steps:
 *
 * 1. Registers a new user account using the `/auth/user/join` API to obtain an
 *    authorized user and its token.
 * 2. Uses the authenticated session of the joined user to query the user list with
 *    filtering, searching and pagination criteria via the
 *    `/todoList/user/todoListUsers` API.
 * 3. Validates the server response ensuring pagination metadata correctness and
 *    filters applied are reflected accurately in the returned user summaries.
 * 4. Checks type safety of API responses and their conformity to the defined DTO
 *    structures.
 */
export async function test_api_todolist_user_pagination_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const email = `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@example.com`;
  const joinBody = {
    email: email satisfies string & tags.Format<"email">,
    password: "testPassword123!",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://referrer.com/page",
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(authorizedUser);

  // Step 2: Query paginated user list with filter
  const requestBody = {
    page: 1,
    limit: 10,
    search: email,
  } satisfies ITodoListUser.IRequest;

  const result: IPageITodoListUser.ISummary =
    await api.functional.todoList.user.todoListUsers.index(connection, {
      body: requestBody,
    });
  typia.assert(result);

  // Pagination validation
  TestValidator.predicate(
    "pagination.current is equal to request page",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit is equal to request limit",
    result.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination.pages is greater than or equal to 1",
    result.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination.records is less than or equal to limit",
    result.pagination.records <= 10,
  );

  // User list validation
  TestValidator.predicate(
    "Every user in the list matches the search filter",
    result.data.every((user) => user.email.includes(email)),
  );

  TestValidator.predicate(
    "Each user summary contains all required properties",
    result.data.every(
      (user) =>
        typeof user.id === "string" &&
        typeof user.email === "string" &&
        typeof user.created_at === "string" &&
        typeof user.updated_at === "string",
    ),
  );
}
