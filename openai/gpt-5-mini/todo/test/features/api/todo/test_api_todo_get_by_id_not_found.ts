import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_get_by_id_not_found(
  connection: api.IConnection,
) {
  // Scenario: Attempt to GET a todo by a well-formed UUID that does not exist.
  // 1) Register a new user to ensure authenticated context (SDK will attach token).
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: userEmail,
    password: "Password123!",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Generate a valid UUID that (very likely) does not correspond to any todo.
  const nonExistentTodoId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Attempt to retrieve the non-existent todo and assert that the call fails.
  //    We use TestValidator.error with an async callback to ensure the Promise rejection
  //    is properly captured. We avoid asserting specific HTTP status codes here.
  await TestValidator.error(
    "getting non-existent todo should throw",
    async () => {
      await api.functional.todoApp.user.todos.at(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
