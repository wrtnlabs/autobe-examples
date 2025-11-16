import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creating todo items with various priority levels.
 *
 * This test validates that the three-tier priority system ('low', 'medium',
 * 'high') works correctly during todo creation. It ensures users can
 * effectively categorize task importance from the moment of creation by testing
 * all possible priority values including null.
 *
 * Step-by-step process:
 *
 * 1. Register a new user account to establish authentication context
 * 2. Create a todo item with 'low' priority and verify the priority field
 * 3. Create a todo item with 'medium' priority and verify the priority field
 * 4. Create a todo item with 'high' priority and verify the priority field
 * 5. Create a todo item with null priority and verify the priority field
 * 6. Validate that all created todos maintain their specified priority values
 */
export async function test_api_todo_creation_various_priority_levels(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create todo with 'low' priority
  const lowPriorityTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Low priority task",
        description: "This is a low priority task",
        priority: "low",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(lowPriorityTodo);
  TestValidator.equals(
    "low priority todo has correct priority",
    lowPriorityTodo.priority,
    "low",
  );

  // Step 3: Create todo with 'medium' priority
  const mediumPriorityTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Medium priority task",
        description: "This is a medium priority task",
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(mediumPriorityTodo);
  TestValidator.equals(
    "medium priority todo has correct priority",
    mediumPriorityTodo.priority,
    "medium",
  );

  // Step 4: Create todo with 'high' priority
  const highPriorityTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "High priority task",
        description: "This is a high priority task",
        priority: "high",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(highPriorityTodo);
  TestValidator.equals(
    "high priority todo has correct priority",
    highPriorityTodo.priority,
    "high",
  );

  // Step 5: Create todo with null priority
  const nullPriorityTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "No priority task",
        description: "This is a task without priority",
        priority: null,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(nullPriorityTodo);
  TestValidator.equals(
    "null priority todo has correct priority",
    nullPriorityTodo.priority,
    null,
  );
}
