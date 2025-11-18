import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deleting multiple todos in sequence for bulk deletion validation.
 *
 * This test creates several todos with different properties (completed/pending
 * status, various priorities, with/without due dates), then deletes each one
 * sequentially. It verifies that each deletion succeeds and todos are removed
 * from the system.
 *
 * Workflow:
 *
 * 1. Authenticate user via registration
 * 2. Create first todo (pending, high priority, with due date)
 * 3. Create second todo (pending, low priority, no due date)
 * 4. Create third todo (pending, medium priority, with due date)
 * 5. Delete first todo and verify removal
 * 6. Delete second todo and verify removal
 * 7. Delete third todo and verify removal
 */
export async function test_api_todo_deletion_bulk_deletions(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user via registration
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create first todo (pending, high priority, with due date)
  const todo1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "High Priority Task",
        description: "This is a high priority task",
        priority: "high",
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo1);
  TestValidator.predicate(
    "first todo should be created and pending",
    todo1.completed === false,
  );

  // Step 3: Create second todo (pending, low priority, no due date)
  const todo2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Low Priority Task",
        description: "This is a low priority task",
        priority: "low",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo2);
  TestValidator.predicate(
    "second todo should be created and pending",
    todo2.completed === false,
  );

  // Step 4: Create third todo (pending, medium priority, with due date)
  const todo3: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Medium Priority Task",
        description: "This is a medium priority task",
        priority: "medium",
        due_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo3);
  TestValidator.predicate(
    "third todo should be created and pending",
    todo3.completed === false,
  );

  // Step 5: Delete first todo
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo1.id,
  });
  TestValidator.predicate("first todo deletion should succeed", true);

  // Step 6: Delete second todo
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo2.id,
  });
  TestValidator.predicate("second todo deletion should succeed", true);

  // Step 7: Delete third todo
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo3.id,
  });
  TestValidator.predicate("third todo deletion should succeed", true);
}
