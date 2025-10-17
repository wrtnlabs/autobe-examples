import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_retrieve_not_found(
  connection: api.IConnection,
) {
  // 1) Register a new user to establish an authenticated context.
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const created: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "Password123", // Meets min length requirement (>=8)
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  // Validate the authorization response shape
  typia.assert(created);

  // 2) Generate a syntactically valid UUID that (very likely) does not exist
  //    in the database and attempt to retrieve it.
  const nonExistentTodoId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Expect a 404 Not Found when attempting to retrieve a non-existent todo.
  //    Use TestValidator.httpError to assert an HttpError with status 404 is thrown.
  await TestValidator.httpError(
    "retrieving non-existent todo returns 404",
    404,
    async () => {
      await api.functional.todoApp.user.todos.at(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
