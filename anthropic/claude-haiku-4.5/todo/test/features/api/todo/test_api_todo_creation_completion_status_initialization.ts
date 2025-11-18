import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that newly created todos are initialized with completion status
 * false.
 *
 * This test ensures that when a todo is created through the API, the system
 * automatically initializes the 'completed' field to false (indicating the todo
 * is pending/incomplete) and sets 'completed_at' timestamp to null (since it
 * hasn't been completed yet).
 *
 * The test verifies this behavior consistently across multiple todo creation
 * scenarios:
 *
 * 1. Create a todo with minimal fields (only title)
 * 2. Create a todo with additional fields (description, priority, due date)
 * 3. Verify that regardless of what fields are provided in creation request, the
 *    system always initializes completion status correctly
 *
 * Steps:
 *
 * 1. Create a user account for authentication
 * 2. Create multiple todos with varying field configurations
 * 3. Verify each created todo has completed=false
 * 4. Verify each created todo has completed_at=null
 * 5. Validate that other fields (title, description, etc.) are correctly stored
 */
export async function test_api_todo_creation_completion_status_initialization(
  connection: api.IConnection,
) {
  // Step 1: Create a user account and authenticate
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create first todo with minimal fields
  const minimalTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(minimalTodo);

  // Verify completion status for minimal todo
  TestValidator.equals(
    "minimal todo should have completed status false",
    minimalTodo.completed,
    false,
  );
  TestValidator.equals(
    "minimal todo should have null completed_at timestamp",
    minimalTodo.completed_at,
    null,
  );

  // Step 3: Create second todo with description
  const todoWithDescription: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoWithDescription);

  // Verify completion status for todo with description
  TestValidator.equals(
    "todo with description should have completed status false",
    todoWithDescription.completed,
    false,
  );
  TestValidator.equals(
    "todo with description should have null completed_at timestamp",
    todoWithDescription.completed_at,
    null,
  );

  // Step 4: Create third todo with priority
  const todoWithPriority: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoWithPriority);

  // Verify completion status for todo with priority
  TestValidator.equals(
    "todo with priority should have completed status false",
    todoWithPriority.completed,
    false,
  );
  TestValidator.equals(
    "todo with priority should have null completed_at timestamp",
    todoWithPriority.completed_at,
    null,
  );

  // Step 5: Create fourth todo with due date
  const futureDateRange = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  const futureDate = new Date(Date.now() + futureDateRange).toISOString();
  const todoWithDueDate: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        due_date: futureDate,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoWithDueDate);

  // Verify completion status for todo with due date
  TestValidator.equals(
    "todo with due date should have completed status false",
    todoWithDueDate.completed,
    false,
  );
  TestValidator.equals(
    "todo with due date should have null completed_at timestamp",
    todoWithDueDate.completed_at,
    null,
  );

  // Step 6: Create fifth todo with all fields
  const completelyFilledTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "high",
        due_date: new Date(Date.now() + futureDateRange).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(completelyFilledTodo);

  // Verify completion status for fully populated todo
  TestValidator.equals(
    "fully populated todo should have completed status false",
    completelyFilledTodo.completed,
    false,
  );
  TestValidator.equals(
    "fully populated todo should have null completed_at timestamp",
    completelyFilledTodo.completed_at,
    null,
  );

  // Step 7: Verify all todos maintain proper initialization across variations
  const allTodos = [
    minimalTodo,
    todoWithDescription,
    todoWithPriority,
    todoWithDueDate,
    completelyFilledTodo,
  ];

  for (const todo of allTodos) {
    TestValidator.predicate(
      "all todos should have completed=false regardless of other fields",
      todo.completed === false,
    );
    TestValidator.predicate(
      "all todos should have completed_at=null regardless of other fields",
      todo.completed_at === null,
    );
  }
}
