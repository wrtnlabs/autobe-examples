import api from "@ORGANIZATION/PROJECT-api";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";

export async function test_api_todo_list_retrieval_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as user by joining
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {};
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 2. Retrieve user's todo list with default pagination, no filters, default sorting (creation date ascending)
  // According to specs, empty body means default pagination, no filters, default sort
  const body: IMultiUserTodoTodo.IRequest = {};
  const result = await api.functional.multiUserTodo.user.todos.index(
    userConnection,
    { body },
  );
  typia.assert(result);
  // 3. Validate response
  // Check pagination metadata correctness
  const pagination = result.pagination;
  TestValidator.predicate(
    "pagination current page positive",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  // 4. Validate all todos in data
  for (const todo of result.data) {
    typia.assert(todo);
    // Removed validation of non-existent properties to fix compilation errors
  }
}
