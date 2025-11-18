import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating only the due_date field of a todo item.
 *
 * This test validates that the API correctly handles partial updates where only
 * the due_date is modified while preserving all other todo fields. The test
 * creates a todo with initial values, updates only the due_date to various
 * future dates, verifies the update while ensuring other fields remain
 * unchanged, and tests setting due_date to null to remove the deadline.
 *
 * Test flow:
 *
 * 1. Authenticate user to establish session
 * 2. Create a todo with title, description, priority, and due_date
 * 3. Update only the due_date to a new future date
 * 4. Verify due_date changed while other fields remained the same
 * 5. Update due_date again to another future date
 * 6. Test clearing due_date by setting it to null
 * 7. Verify due_date is null and other fields preserved
 */
export async function test_api_todo_update_due_date_only(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create initial todo with all fields
  const initialDueDate = new Date();
  initialDueDate.setDate(initialDueDate.getDate() + 7); // 7 days from now

  const todoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 3 });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: "medium",
        due_date: initialDueDate.toISOString(),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Verify initial todo state
  TestValidator.equals(
    "initial todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "initial todo priority is medium",
    createdTodo.priority,
    "medium",
  );
  TestValidator.predicate(
    "initial todo has due_date",
    createdTodo.due_date !== null && createdTodo.due_date !== undefined,
  );

  // Step 3: Update only the due_date to a new future date
  const newDueDate = new Date();
  newDueDate.setDate(newDueDate.getDate() + 14); // 14 days from now

  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        due_date: newDueDate.toISOString(),
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Verify due_date was updated while other fields remained the same
  TestValidator.notEquals(
    "due_date changed after update",
    createdTodo.due_date,
    updatedTodo.due_date,
  );
  TestValidator.equals(
    "title remained unchanged",
    createdTodo.title,
    updatedTodo.title,
  );
  TestValidator.equals(
    "description remained unchanged",
    createdTodo.description,
    updatedTodo.description,
  );
  TestValidator.equals(
    "priority remained unchanged",
    createdTodo.priority,
    updatedTodo.priority,
  );
  TestValidator.equals(
    "completed status remained unchanged",
    createdTodo.completed,
    updatedTodo.completed,
  );

  // Step 5: Update due_date again to another future date
  const anotherDueDate = new Date();
  anotherDueDate.setDate(anotherDueDate.getDate() + 21); // 21 days from now

  const updatedTodoAgain: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        due_date: anotherDueDate.toISOString(),
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodoAgain);

  TestValidator.notEquals(
    "due_date changed to another future date",
    updatedTodo.due_date,
    updatedTodoAgain.due_date,
  );
  TestValidator.equals(
    "title still unchanged after second update",
    createdTodo.title,
    updatedTodoAgain.title,
  );

  // Step 6: Clear due_date by setting it to null
  const clearedDueDateTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        due_date: null,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(clearedDueDateTodo);

  // Step 7: Verify due_date is null and other fields preserved
  TestValidator.equals(
    "due_date cleared to null",
    clearedDueDateTodo.due_date,
    null,
  );
  TestValidator.equals(
    "title still unchanged after clearing due_date",
    createdTodo.title,
    clearedDueDateTodo.title,
  );
  TestValidator.equals(
    "description still unchanged after clearing due_date",
    createdTodo.description,
    clearedDueDateTodo.description,
  );
  TestValidator.equals(
    "priority still unchanged after clearing due_date",
    createdTodo.priority,
    clearedDueDateTodo.priority,
  );
}
