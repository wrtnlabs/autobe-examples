import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUser";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test scenario for filtered and paginated retrieval of todo users accessible
 * to member roles.
 *
 * 1. Register a new member user for authentication via /auth/user/join endpoint.
 * 2. Use obtained authorization token to authenticate subsequent requests.
 * 3. Execute /todo/user/todoUsers PATCH requests with specific filter criteria
 *    such as email domain filtering and pagination parameters.
 * 4. Validate that the returned user list complies with the search filters and
 *    pagination.
 * 5. Confirm no sensitive data like password hashes is leaked.
 * 6. Validate pagination metadata is accurate.
 */
export async function test_api_user_todousers_filtered_list_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new todo user (member) via join endpoint
  const newUser: ITodoUser.ICreate = {
    email: `test.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoUser.ICreate;

  const authorizedUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: newUser,
    });
  typia.assert(authorizedUser);

  // Now the SDK manages connection.headers.Authorization automatically.

  // Step 2: Prepare various search queries
  // Search 1: Filter by email domain
  const searchByEmailDomain: ITodoUser.IRequest = {
    page: 1,
    limit: 20,
    search: "@example.com",
    sortBy: "email",
    sortOrder: "asc",
  } satisfies ITodoUser.IRequest;

  const resultByEmailDomain: IPageITodoUser.ISummary =
    await api.functional.todo.user.todoUsers.index(connection, {
      body: searchByEmailDomain,
    });
  typia.assert(resultByEmailDomain);

  TestValidator.predicate(
    "all returned emails contain '@example.com'",
    resultByEmailDomain.data.every((user) =>
      user.email.includes("@example.com"),
    ),
  );

  TestValidator.predicate(
    "no sensitive fields like password_hash included",
    resultByEmailDomain.data.every((user) => !("password_hash" in user)),
  );

  TestValidator.predicate(
    "pagination data current page is 1",
    resultByEmailDomain.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is 20",
    resultByEmailDomain.pagination.limit === 20,
  );

  TestValidator.predicate(
    "data length does not exceed limit",
    resultByEmailDomain.data.length <= 20,
  );

  TestValidator.predicate(
    "pages calculated correctly",
    resultByEmailDomain.pagination.pages >= 1 &&
      resultByEmailDomain.pagination.records >= resultByEmailDomain.data.length,
  );

  // Step 3: Test pagination by requesting page 2 with limit 5
  const searchPage2Limit5: ITodoUser.IRequest = {
    page: 2,
    limit: 5,
    search: "@example.com",
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies ITodoUser.IRequest;

  const resultPage2: IPageITodoUser.ISummary =
    await api.functional.todo.user.todoUsers.index(connection, {
      body: searchPage2Limit5,
    });
  typia.assert(resultPage2);

  TestValidator.predicate(
    "pagination current page is 2",
    resultPage2.pagination.current === 2,
  );

  TestValidator.predicate(
    "pagination limit is 5",
    resultPage2.pagination.limit === 5,
  );

  TestValidator.predicate(
    "data length does not exceed 5",
    resultPage2.data.length <= 5,
  );

  TestValidator.predicate(
    "all returned emails contain '@example.com' on page 2",
    resultPage2.data.every((user) => user.email.includes("@example.com")),
  );

  TestValidator.predicate(
    "no sensitive data like password_hash on page 2",
    resultPage2.data.every((user) => !("password_hash" in user)),
  );
}
