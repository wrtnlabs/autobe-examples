import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a todo's title to values at the length boundaries.
 *
 * Validates that the todo update endpoint properly enforces the title length
 * constraints. The title field must be between 1-255 characters after
 * whitespace trimming.
 *
 * Process:
 *
 * 1. Register and authenticate a user
 * 2. Create a todo item with a standard title
 * 3. Update the todo with a 1-character title (minimum boundary) and verify
 * 4. Update the todo with a 255-character title (maximum boundary) and verify
 * 5. Attempt to update with a 256-character title and validate rejection
 *
 * This test ensures the maxLength constraint is properly enforced on updates.
 */
export async function test_api_todo_update_title_new_length_boundaries(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a todo item with a standard title
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);

  // 3. Update with 1-character title (minimum boundary)
  const minBoundaryTitle = "a";
  const updatedWithMin: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        title: minBoundaryTitle,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedWithMin);
  TestValidator.equals(
    "todo title updated to 1 character",
    updatedWithMin.title,
    minBoundaryTitle,
  );

  // 4. Update with 255-character title (maximum boundary)
  const maxBoundaryTitle = RandomGenerator.alphabets(255);
  const updatedWithMax: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: todo.id,
      body: {
        title: maxBoundaryTitle,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedWithMax);
  TestValidator.equals(
    "todo title updated to 255 characters",
    updatedWithMax.title,
    maxBoundaryTitle,
  );

  // 5. Attempt to update with 256-character title (exceeds maximum)
  const exceedsMaxTitle = RandomGenerator.alphabets(256);
  await TestValidator.error(
    "should reject title exceeding 255 characters",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: todo.id,
        body: {
          title: exceedsMaxTitle,
        } satisfies ITodoListTodo.IUpdate,
      });
    },
  );
}
