import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that a minimal Todo List user can successfully delete their own Todo
 * item.
 *
 * This test ensures that a typical user can follow the workflow of
 * registration, Todo creation, and then deletion, using only core required
 * fields and satisfying all DTO type and business logic constraints. It
 * verifies successful deletion and ensures that the same Todo cannot be deleted
 * twice (repeat delete yields an error). This covers the minimal success and
 * core failure scenario.
 *
 * Steps:
 *
 * 1. Register a new user (with unique email/password).
 * 2. Create a Todo as that user (valid title, no description required).
 * 3. Delete the Todo by id as the owner.
 * 4. Attempt to delete the Todo again and check for not-found error.
 */
export async function test_api_todo_delete_successful_by_owner(
  connection: api.IConnection,
) {
  // 1. Register user for session
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const auth = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(auth);

  // 2. Create a Todo item as the user
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 10,
      }),
      description: null,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);

  // 3. Delete the Todo item
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Attempt to delete again and expect an error (not found)
  await TestValidator.error(
    "repeat deletion returns not-found error",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
