import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_user_retrieval_by_user(
  connection: api.IConnection,
) {
  // 1. Join as a new Todo List user
  const createUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;
  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createUserBody,
    });
  typia.assert(authorizedUser);

  // 2. Fetch the detailed Todo List user info by ID
  const userDetail: ITodoListTodoListUser =
    await api.functional.todoList.user.todoListUsers.at(connection, {
      id: authorizedUser.id,
    });
  typia.assert(userDetail);

  // 3. Verify the retrieved user data matches the created data
  TestValidator.equals(
    "User ID should match authorized user's ID",
    userDetail.id,
    authorizedUser.id,
  );

  TestValidator.equals(
    "User email should match authorized user's email",
    userDetail.email,
    createUserBody.email,
  );
}
