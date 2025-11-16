import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_user_update_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account using the join endpoint
  const createUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;
  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: createUserBody });
  typia.assert(authorizedUser);

  // Step 2: Prepare the updated user data for the update endpoint
  const updateUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    role: RandomGenerator.pick(["user", "admin", "moderator"] as const),
  } satisfies ITodoListTodoListUser.IUpdate;

  // Step 3: Perform the update operation
  const updatedUser: ITodoListTodoListUser =
    await api.functional.todoList.user.todoListUsers.update(connection, {
      id: authorizedUser.id,
      body: updateUserBody,
    });
  typia.assert(updatedUser);

  // Step 4: Validate the returned updated fields against the update payload
  TestValidator.equals(
    "updated user email matches",
    updatedUser.email,
    updateUserBody.email,
  );
  TestValidator.equals(
    "updated user username matches",
    updatedUser.username,
    updateUserBody.username,
  );
  TestValidator.equals(
    "updated user display_name matches",
    updatedUser.display_name,
    updateUserBody.display_name,
  );
  TestValidator.equals(
    "updated user role matches",
    updatedUser.role,
    updateUserBody.role,
  );
}
