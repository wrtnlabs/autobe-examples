import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving todo items created with different priority levels.
 *
 * This test validates that the priority categorization system ('low', 'medium',
 * 'high', and null) works correctly by creating todos with each priority value
 * and verifying that retrieval returns the correct priority for task
 * organization.
 *
 * Test Steps:
 *
 * 1. Register and authenticate a test user
 * 2. Create four todos with different priority levels (low, medium, high, null)
 * 3. Retrieve each todo by ID
 * 4. Validate that each retrieved todo has the correct priority value
 */
export async function test_api_todo_retrieval_different_priority_levels(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a test user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create todos with different priority levels
  const priorityLevels: Array<"low" | "medium" | "high" | null> = [
    "low",
    "medium",
    "high",
    null,
  ];

  const createdTodos: ITodoListTodo[] = await ArrayUtil.asyncMap(
    priorityLevels,
    async (priority) => {
      const todo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            description: RandomGenerator.paragraph({ sentences: 10 }),
            priority: priority,
            status: "pending",
            completed: false,
          } satisfies ITodoListTodo.ICreate,
        });
      typia.assert(todo);
      return todo;
    },
  );

  // Step 3 & 4: Retrieve each todo and validate priority
  await ArrayUtil.asyncForEach(createdTodos, async (createdTodo, index) => {
    const retrievedTodo: ITodoListTodo =
      await api.functional.todoList.user.todos.at(connection, {
        todoId: createdTodo.id,
      });
    typia.assert(retrievedTodo);

    // Validate the retrieved todo has correct priority
    const expectedPriority = priorityLevels[index];
    TestValidator.equals(
      `todo priority should match created priority (${expectedPriority})`,
      retrievedTodo.priority,
      expectedPriority,
    );

    // Validate the todo ID matches
    TestValidator.equals(
      "retrieved todo ID should match created todo ID",
      retrievedTodo.id,
      createdTodo.id,
    );

    // Validate title matches
    TestValidator.equals(
      "retrieved todo title should match created todo title",
      retrievedTodo.title,
      createdTodo.title,
    );
  });
}
