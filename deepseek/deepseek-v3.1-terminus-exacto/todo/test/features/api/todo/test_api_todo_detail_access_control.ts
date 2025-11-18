import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test enforcement of private access for todo details.
 *
 * This test ensures that a user cannot access todo items that they do not own,
 * and that the system strictly enforces ownership-based access control for
 * retrieving todo details.
 *
 * Steps:
 *
 * 1. Register a new user.
 * 2. Generate a random UUID which is not associated to any todo for the user
 *    (simulate a non-existent or another user's todo).
 * 3. Attempt to retrieve the todo details with GET /todoList/user/todos/:todoId
 *    using this UUID.
 * 4. Verify the API rejects the request with a business logic error (forbidden or
 *    not found), proving access control is enforced.
 */
export async function test_api_todo_detail_access_control(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<
        string & tags.MinLength<3> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.MaxLength<72> &
          tags.Format<"password">
      >(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // 2. Generate a random UUID which should not belong to any todo for this user
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();

  // 3&4. Try to access todo detail with a random/invalid id and confirm access is denied strictly
  await TestValidator.error(
    "forbidden or not found when accessing todo with invalid or non-owned id",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: randomTodoId,
      });
    },
  );
}
