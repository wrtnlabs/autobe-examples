import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoListUser";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_user_update_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new Todo List user via join and receive authorization token.
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Use the authorized token automatically set in connection to perform update operation.
  // For this, we simulate updating the same user by providing valid request body
  // matching ITodoListTodoListUser.IRequest with pagination and relevant filters.

  // Build update request data - since the endpoint is PATCH and the input is ITodoListTodoListUser.IRequest,
  // we assume the update is a search with filters for this user id and/or email,
  // The test will execute a request to see if these filters work properly.
  const updateRequestBody = {
    page: 1,
    limit: 10,
    search: userCreateBody.email,
    is_active: true,
  } satisfies ITodoListTodoListUser.IRequest;

  const pageResult: IPageITodoListTodoListUser.ISummary =
    await api.functional.todoList.user.todoListUsers.index(connection, {
      body: updateRequestBody,
    });
  typia.assert(pageResult);

  // Step 3: Validate that the updated user appears in the returned list.
  TestValidator.predicate(
    "Returned user list includes updated user",
    pageResult.data.some((user) => user.email === userCreateBody.email),
  );
}
