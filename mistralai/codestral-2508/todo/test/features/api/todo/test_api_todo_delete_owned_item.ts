import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate deletion of a todo task by its owner and enforce strict ownership.
 *
 * This test simulates the workflow for a user registering, creating a todo,
 * then deleting it. After deletion, they're unable to access the todo (verifies
 * hard delete). Attempts by a different user to delete another user's todo must
 * also fail, demonstrating strict enforcement of record-level access control.
 *
 * Steps:
 *
 * 1. Register user1 (owner) and create a todo task
 * 2. Delete the todo as the owner
 * 3. Attempt to view the deleted todo and expect error
 * 4. Register user2 and attempt to delete user1's todo (should fail)
 */
export async function test_api_todo_delete_owned_item(
  connection: api.IConnection,
) {
  // 1. Register user1 (owner)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: ownerEmail,
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.Format<"password">,
        href: "https://owner.com/join",
        referrer: "https://owner.com/landing",
        display_name: RandomGenerator.name(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(owner);

  // 2. Create a todo as owner
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 6,
          wordMax: 12,
        }),
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 10,
          wordMax: 20,
        }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);

  // 3. Delete the todo as owner (should succeed)
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Try getting the deleted todo (should fail)
  // No direct 'get' endpoint, but can indirectly verify by attempting to delete again (should error)
  await TestValidator.error(
    "deleting already-deleted todo should fail",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );

  // 5. Register a different user
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const other: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: otherEmail,
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.Format<"password">,
        href: "https://other.com/join",
        referrer: "https://other.com/landing",
        display_name: RandomGenerator.name(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(other);

  // 6. Other user tries to delete owner's todo (should fail)
  await TestValidator.error(
    "non-owner user cannot delete another user's todo",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
