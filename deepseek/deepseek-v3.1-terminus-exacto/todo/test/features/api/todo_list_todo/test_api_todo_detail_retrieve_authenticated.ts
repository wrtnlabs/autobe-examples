import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that an authenticated user cannot retrieve non-existent todo
 * details.
 *
 * Steps:
 *
 * 1. Register a new user with random valid credentials using the join endpoint.
 * 2. Attempt to retrieve a todo item by a randomly generated UUID (which is
 *    guaranteed to not exist, since no creation endpoint is available in this
 *    context).
 * 3. Assert that the API responds with an error, verifying that not-found or
 *    forbidden conditions are enforced for missing or unauthorized resources.
 */
export async function test_api_todo_detail_retrieve_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: typia.random<
          string &
            tags.MinLength<8> &
            tags.MaxLength<72> &
            tags.Format<"password">
        >(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userAuth);

  // 2. Attempt to retrieve a non-existent todo item by random UUID
  await TestValidator.error(
    "authenticated user cannot fetch non-existent todo",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
