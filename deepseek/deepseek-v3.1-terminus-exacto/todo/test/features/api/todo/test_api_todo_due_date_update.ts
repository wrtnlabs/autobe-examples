import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test todo due date modification specifically.
 *
 * User registers account, creates a todo with initial due date, then updates
 * the due date to a different future date. Validate that due date updates are
 * properly processed and reflected in the todo object. Ensure date validation
 * works correctly and maintains timezone consistency throughout the update
 * process.
 */
export async function test_api_todo_due_date_update(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword, // Using password as hash for simplicity in test
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "pending" as const,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create initial todo with future due date
  const initialDueDateString = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const initialDueDate = typia.assert<string & tags.Format<"date-time">>(
    initialDueDateString,
  );

  const initialTodo = await api.functional.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      due_date: initialDueDate,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(initialTodo);

  // Validate initial todo was created correctly
  TestValidator.predicate(
    "initial todo should have due date",
    initialTodo.due_date !== undefined && initialTodo.due_date !== null,
  );
  TestValidator.equals(
    "initial due date matches input",
    initialTodo.due_date,
    initialDueDate,
  );

  // Step 3: Update todo with new due date
  const updatedDueDateString = new Date(Date.now() + 172800000).toISOString(); // Day after tomorrow
  const updatedDueDate = typia.assert<string & tags.Format<"date-time">>(
    updatedDueDateString,
  );

  const updatedTodo = await api.functional.todoApp.user.todos.update(
    connection,
    {
      todoId: initialTodo.id,
      body: {
        due_date: updatedDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "todo ID remains unchanged after update",
    updatedTodo.id,
    initialTodo.id,
  );
  TestValidator.equals(
    "todo title remains unchanged",
    updatedTodo.title,
    initialTodo.title,
  );
  TestValidator.equals(
    "todo description remains unchanged",
    updatedTodo.description,
    initialTodo.description,
  );
  TestValidator.predicate(
    "updated todo should have due date",
    updatedTodo.due_date !== undefined && updatedTodo.due_date !== null,
  );
  TestValidator.equals(
    "due date was updated correctly",
    updatedTodo.due_date,
    updatedDueDate,
  );
  TestValidator.notEquals(
    "due date should be different from original",
    updatedTodo.due_date,
    initialTodo.due_date,
  );

  // Step 5: Validate date formatting and consistency
  TestValidator.predicate("updated due date should be valid ISO string", () => {
    try {
      const date = new Date(updatedDueDate);
      return date instanceof Date && !isNaN(date.getTime());
    } catch {
      return false;
    }
  });

  // Step 6: Validate that the updated due date is in the future
  TestValidator.predicate(
    "updated due date should be in the future",
    new Date(updatedDueDate) > new Date(),
  );

  // Step 7: Additional validation for todo object integrity
  TestValidator.predicate(
    "created_at timestamp should be set",
    updatedTodo.created_at !== undefined && updatedTodo.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp should be set",
    updatedTodo.updated_at !== undefined && updatedTodo.updated_at !== null,
  );
  TestValidator.predicate(
    "todo should not be deleted",
    updatedTodo.deleted_at === undefined || updatedTodo.deleted_at === null,
  );
}
