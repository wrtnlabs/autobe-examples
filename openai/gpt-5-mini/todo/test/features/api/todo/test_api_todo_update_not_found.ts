import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_update_not_found(
  connection: api.IConnection,
) {
  // 1) Create a new user to ensure the request is authenticated
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);

  const auth: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: password,
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  // Validate the authorization response and ensure the SDK attached the token
  typia.assert(auth);

  // 2) Generate a syntactically valid UUID that (very likely) does not exist
  const missingTodoId: string = typia.random<string & tags.Format<"uuid">>();

  // 3) Attempt to update the non-existent todo and expect 404 Not Found
  await TestValidator.httpError(
    "updating non-existent todo returns 404",
    404,
    async () => {
      await api.functional.todoApp.user.todos.update(connection, {
        todoId: missingTodoId,
        body: { title: "Won't apply" } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
}
