import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoListUser";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

/**
 * This test validates the authorized retrieval of a paginated list of
 * authenticated todo list users using advanced filtering criteria. The test
 * starts by registering a new user via /auth/user/join to establish a valid
 * authentication context. It then performs a PATCH request to
 * /todoList/user/todoListUsers with filters such as email,
 * created_at_start/end, updated_at_start/end, page, and limit to validate
 * proper pagination, filtering, and access control. The expected outcome is a
 * successful 200 OK response with a well-formed paginated list of user
 * summaries matching the filters.
 */
export async function test_api_todo_list_user_pagination_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. User registration to obtain authorization
  const email: string & tags.Format<"email"> =
    `user_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = "Password123!";
  const name = RandomGenerator.name(3);

  // Create the user join payload satisfying ITodoListTodoListUser.ICreate
  const userJoinBody = {
    email,
    password,
    name,
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(authorizedUser);

  // 2. Construct filtering criteria for paginated user query
  // Use some realistic filter values
  const currentDateIso = new Date().toISOString();
  // For filtering created_at_start, use a past date (30 days ago)
  const createdAtStart = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  // For created_at_end, use current date
  const createdAtEnd = currentDateIso;
  // Similarly for updated_at_start and updated_at_end (last 30 days)
  const updatedAtStart = createdAtStart;
  const updatedAtEnd = createdAtEnd;

  const page = 1;
  const limit = 10;

  const filterBody = {
    email, // Filtering by the same email as created user
    created_at_start: createdAtStart,
    created_at_end: createdAtEnd,
    updated_at_start: updatedAtStart,
    updated_at_end: updatedAtEnd,
    page,
    limit,
  } satisfies ITodoListTodoListUser.IRequest;

  // 3. Perform paginated request to get filtered todo list users
  const pagedUsers: IPageITodoListTodoListUser.ISummary =
    await api.functional.todoList.user.todoListUsers.index(connection, {
      body: filterBody,
    });
  typia.assert(pagedUsers);

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is as requested",
    pagedUsers.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit is as requested",
    pagedUsers.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    pagedUsers.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagedUsers.pagination.records >= 0,
  );

  // 5. Validate user data array
  TestValidator.predicate(
    "paged data is an array",
    Array.isArray(pagedUsers.data),
  );

  // 6. If there are items, validate that each user summary matches filter
  for (const user of pagedUsers.data) {
    typia.assert(user);
    // Email filter is only by user email. Here, username is shown but we cannot assert email directly from summary, so we validate id and display_name.
    // However, we only know email filter value, so we cannot assert user email in summary since it doesn't exist.
    // So we only assert that user id and display_name are non-empty strings.
    TestValidator.predicate(
      "user id is non-empty",
      typeof user.id === "string" && user.id.length > 0,
    );
    TestValidator.predicate(
      "user username is non-empty",
      typeof user.username === "string" && user.username.length > 0,
    );
    TestValidator.predicate(
      "user display_name is non-empty",
      typeof user.display_name === "string" && user.display_name.length > 0,
    );
    TestValidator.predicate(
      "user joined_at is a valid ISO date",
      !!user.joined_at && !isNaN(Date.parse(user.joined_at)),
    );
  }

  // 7. If pagination records > 0, ensure at least some data is retrieved
  if (pagedUsers.pagination.records > 0) {
    TestValidator.predicate(
      "data array is non-empty when records > 0",
      pagedUsers.data.length > 0,
    );
  }
}
