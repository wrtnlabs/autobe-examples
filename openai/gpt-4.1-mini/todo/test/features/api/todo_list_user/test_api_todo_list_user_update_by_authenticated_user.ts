import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_user_update_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. User joins and gets authorized with token
  const userCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    name: "John Doe",
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreate });
  typia.assert(authorizedUser);

  // Switch to authorized user context by sdk internal token header

  // 2. Update user email to a new random email
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const userUpdate = {
    email: updatedEmail,
  } satisfies ITodoListTodoListUser.IUpdate;

  const updatedUser: ITodoListTodoListUser =
    await api.functional.todoList.user.todoListUsers.update(connection, {
      id: authorizedUser.id,
      body: userUpdate,
    });
  typia.assert(updatedUser);

  // 3. Validate returned user properties
  TestValidator.equals(
    "updated user id matches",
    updatedUser.id,
    authorizedUser.id,
  );

  TestValidator.equals(
    "email updated correctly",
    updatedUser.email,
    updatedEmail,
  );

  TestValidator.predicate(
    "created_at unchanged",
    typeof updatedUser.created_at === "string" &&
      updatedUser.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at updated",
    typeof updatedUser.updated_at === "string" &&
      updatedUser.updated_at.length > 0 &&
      updatedUser.updated_at !== updatedUser.created_at,
  );
}
