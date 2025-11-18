import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deleting a todo that is still pending (completed: false).
 *
 * This test validates that users can successfully delete todo items that have
 * not yet been marked as complete. The workflow demonstrates:
 *
 * 1. User registration and authentication
 * 2. Creating a pending todo item (completed: false)
 * 3. Immediately deleting the pending todo
 * 4. Verifying the deletion completed successfully
 *
 * This ensures that deletion works on todos at any completion stage, and that
 * users can manage their task list by removing pending items whenever needed.
 */
export async function test_api_todo_deletion_pending_todo(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.equals(
    "user registered successfully",
    typeof user.id,
    "string",
  );

  // Step 2: Create a pending todo item (not completed)
  const pendingTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "medium",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(pendingTodo);
  TestValidator.equals(
    "todo created with pending status",
    pendingTodo.completed,
    false,
  );
  TestValidator.equals("todo has valid ID", typeof pendingTodo.id, "string");

  // Step 3: Delete the pending todo immediately
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: pendingTodo.id,
  });

  // Step 4: Verify deletion was successful by attempting to delete again
  // This should fail, confirming the todo no longer exists
  await TestValidator.error(
    "deleting already-deleted pending todo should fail",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: pendingTodo.id,
      });
    },
  );

  TestValidator.predicate(
    "pending todo deletion workflow completed successfully",
    true,
  );
}
