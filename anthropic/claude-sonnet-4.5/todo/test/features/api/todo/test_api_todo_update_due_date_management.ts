import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test due date updates including setting, changing, and clearing due dates.
 *
 * This scenario validates that users can set a due_date timestamp, update it to
 * a different date, and clear it by setting it to null. The test creates a todo
 * without a due date, adds a due date through update, changes the due date to a
 * different value, and finally removes the due date by setting it to null. It
 * verifies that ISO 8601 date-time format is properly handled and that null
 * values correctly clear the due date field.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a user account
 * 2. Create a todo item without a due_date
 * 3. Update the todo to add a due_date timestamp (ISO 8601 format)
 * 4. Verify the due_date was set correctly
 * 5. Update the todo to change the due_date to a different timestamp
 * 6. Verify the due_date was updated correctly
 * 7. Update the todo to clear the due_date by setting it to null
 * 8. Verify the due_date was cleared (null)
 */
export async function test_api_todo_update_due_date_management(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo item without a due_date
  const initialTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "pending",
        priority: "medium",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(initialTodo);

  // Verify initial todo has no due_date
  TestValidator.equals(
    "initial todo should have no due_date",
    initialTodo.due_date,
    null,
  );

  // Step 3: Update the todo to add a due_date timestamp (ISO 8601 format)
  const firstDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todoWithDueDate: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        due_date: firstDueDate,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(todoWithDueDate);

  // Step 4: Verify the due_date was set correctly
  TestValidator.equals(
    "due_date should be set to first timestamp",
    todoWithDueDate.due_date,
    firstDueDate,
  );

  // Step 5: Update the todo to change the due_date to a different timestamp
  const secondDueDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todoWithUpdatedDueDate: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        due_date: secondDueDate,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(todoWithUpdatedDueDate);

  // Step 6: Verify the due_date was updated correctly
  TestValidator.equals(
    "due_date should be updated to second timestamp",
    todoWithUpdatedDueDate.due_date,
    secondDueDate,
  );
  TestValidator.notEquals(
    "new due_date should differ from first due_date",
    todoWithUpdatedDueDate.due_date,
    firstDueDate,
  );

  // Step 7: Update the todo to clear the due_date by setting it to null
  const todoWithClearedDueDate: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        due_date: null,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(todoWithClearedDueDate);

  // Step 8: Verify the due_date was cleared (null)
  TestValidator.equals(
    "due_date should be cleared to null",
    todoWithClearedDueDate.due_date,
    null,
  );
}
