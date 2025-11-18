import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates update of a user's own Todo item through the update API.
 *
 * This test covers:
 *
 * 1. User registration/join for authentication
 * 2. Creating a new Todo item
 * 3. Updating each editable Todo field (description, due_date, completed)
 *    independently
 * 4. Confirming all business constraints (description length, due_date format,
 *    completed flag logic) are enforced
 * 5. Testing edge cases like nulling due_date, toggling completed status
 * 6. Confirming timestamps (updated_at, completed_at) update as per business logic
 * 7. Verifying update is forbidden from a different user account
 */
export async function test_api_todolist_todo_update_by_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password satisfies string as string,
      href: "https://test.todolist.app/join",
      referrer: "https://test.todolist.app/landing",
      ip: "192.168.0.17",
    },
  });
  typia.assert(userAuth);

  // 2. User creates a Todo item
  const initialDescription = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
  });
  const initialDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      description: initialDescription,
      due_date: initialDueDate,
    },
  });
  typia.assert(todo);
  TestValidator.equals("todo owns the user", todo.user.id, userAuth.id);
  TestValidator.equals(
    "initial values retained",
    { description: todo.description, due_date: todo.due_date },
    { description: initialDescription, due_date: initialDueDate },
  );
  TestValidator.equals("not completed by default", todo.completed, false);
  TestValidator.equals("completed_at initially null", todo.completed_at, null);

  // 3. Update Description
  const newDescription = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 6,
  });
  const updated1 = await api.functional.todoList.user.todos.update(connection, {
    todoId: todo.id,
    body: { description: newDescription },
  });
  typia.assert(updated1);
  TestValidator.equals(
    "description updated",
    updated1.description,
    newDescription,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated1.updated_at,
    todo.updated_at,
  );
  TestValidator.equals("due_date unchanged", updated1.due_date, todo.due_date);
  TestValidator.equals("completed unchanged", updated1.completed, false);

  // 4. Update Due Date (to null)
  const updated2 = await api.functional.todoList.user.todos.update(connection, {
    todoId: todo.id,
    body: { due_date: null },
  });
  typia.assert(updated2);
  TestValidator.equals("due_date set null", updated2.due_date, null);
  TestValidator.notEquals(
    "updated_at changed after due_date update",
    updated2.updated_at,
    updated1.updated_at,
  );

  // 5. Mark as completed
  const updated3 = await api.functional.todoList.user.todos.update(connection, {
    todoId: todo.id,
    body: { completed: true },
  });
  typia.assert(updated3);
  TestValidator.equals("marked as completed", updated3.completed, true);
  TestValidator.predicate(
    "completed_at set when done",
    typeof updated3.completed_at === "string" &&
      updated3.completed_at.length > 0,
  );

  // 6. Unmark as completed (should revert completed_at)
  const updated4 = await api.functional.todoList.user.todos.update(connection, {
    todoId: todo.id,
    body: { completed: false },
  });
  typia.assert(updated4);
  TestValidator.equals("unmarked as completed", updated4.completed, false);
  TestValidator.equals(
    "completed_at is null after unmark",
    updated4.completed_at,
    null,
  );

  // 7. Register a second user, attempt update on other's Todo (should fail)
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = RandomGenerator.alphaNumeric(15);
  const otherUserAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: otherEmail,
      password: otherPassword satisfies string as string,
      href: "https://test.todolist.app/join",
      referrer: "https://test.todolist.app/landing",
      ip: "8.8.8.8",
    },
  });
  typia.assert(otherUserAuth);

  await TestValidator.error(
    "other user forbidden from updating not-owned Todo",
    async () => {
      await api.functional.todoList.user.todos.update(connection, {
        todoId: todo.id,
        body: { description: RandomGenerator.paragraph({ sentences: 2 }) },
      });
    },
  );
}
