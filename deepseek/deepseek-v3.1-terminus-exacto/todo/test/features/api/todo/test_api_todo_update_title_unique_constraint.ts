import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that updating a todo item's title to a value already in use by
 * another of the user's todos is forbidden.
 *
 * This test enforces the per-user unique title constraint for todo items. It
 * starts by registering a new user, then creates two todos with different
 * titles. It then attempts to update the first todo's title to match the
 * second's, asserting that such an update is rejected by validation logic
 * (enforcing uniqueness on update).
 *
 * Step-by-step process:
 *
 * 1. Register a new user account
 * 2. Create first todo with title 'title1'
 * 3. Create second todo with title 'title2'
 * 4. Attempt to update the first todo's title to 'title2'
 * 5. Assert a validation error is thrown (duplicate title forbidden)
 */
export async function test_api_todo_update_title_unique_constraint(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password: password as string &
          tags.MinLength<8> &
          tags.MaxLength<72> &
          tags.Format<"password">,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.equals(
    "registered user email matches input",
    user.email,
    email,
  );

  // 2. Create two todos with distinct titles
  const title1 = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 12,
  });
  const todo1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: title1 as string &
          tags.MinLength<1> &
          tags.MaxLength<100> &
          tags.Pattern<"^(?!\\s*$).+">,
        status: "pending",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo1);
  TestValidator.equals("todo1 title matches", todo1.title, title1);

  const title2 = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 12,
  });
  const todo2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: title2 as string &
          tags.MinLength<1> &
          tags.MaxLength<100> &
          tags.Pattern<"^(?!\\s*$).+">,
        status: "pending",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo2);
  TestValidator.equals("todo2 title matches", todo2.title, title2);

  // 3. Attempt to update todo1's title to the title of todo2, expect validation error.
  await TestValidator.error(
    "updating todo title to duplicate of another todo's title is forbidden",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: todo1.id,
        body: {
          title: todo2.title as string &
            tags.MinLength<1> &
            tags.MaxLength<100> &
            tags.Pattern<"^(?!\\s*$).+">,
        } satisfies ITodoListTodo.IUpdate,
      });
    },
  );
}
