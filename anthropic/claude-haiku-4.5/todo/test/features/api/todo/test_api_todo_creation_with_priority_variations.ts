import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test todo creation with different priority level variations.
 *
 * This test validates that todos can be created with different priority levels
 * ('low', 'medium', 'high') and that the priority field is properly stored and
 * retrieved. It also verifies that when priority is not specified, the system
 * defaults to 'medium' as specified in the API contract.
 *
 * Test workflow:
 *
 * 1. Authenticate user by joining the system
 * 2. Create a todo with priority set to 'low'
 * 3. Verify the created todo has priority 'low'
 * 4. Create a todo with priority set to 'medium'
 * 5. Verify the created todo has priority 'medium'
 * 6. Create a todo with priority set to 'high'
 * 7. Verify the created todo has priority 'high'
 * 8. Create a todo without specifying priority
 * 9. Verify the created todo defaults to priority 'medium'
 * 10. Validate all priority values are persisted correctly
 */
export async function test_api_todo_creation_with_priority_variations(
  connection: api.IConnection,
) {
  // 1. Authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(12);

  const authenticatedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(authenticatedUser);

  // 2. Create todo with priority 'low'
  const lowPriorityTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        priority: "low",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(lowPriorityTodo);
  TestValidator.equals(
    "low priority todo has correct priority",
    lowPriorityTodo.priority,
    "low",
  );

  // 3. Create todo with priority 'medium'
  const mediumPriorityTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(mediumPriorityTodo);
  TestValidator.equals(
    "medium priority todo has correct priority",
    mediumPriorityTodo.priority,
    "medium",
  );

  // 4. Create todo with priority 'high'
  const highPriorityTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        priority: "high",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(highPriorityTodo);
  TestValidator.equals(
    "high priority todo has correct priority",
    highPriorityTodo.priority,
    "high",
  );

  // 5. Create todo without specifying priority (should default to 'medium')
  const defaultPriorityTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(defaultPriorityTodo);
  TestValidator.equals(
    "todo without priority defaults to medium",
    defaultPriorityTodo.priority,
    "medium",
  );

  // 6. Verify all todos have correct priority values persisted
  TestValidator.predicate("all priority values are valid", () => {
    const priorities = [
      lowPriorityTodo.priority,
      mediumPriorityTodo.priority,
      highPriorityTodo.priority,
      defaultPriorityTodo.priority,
    ];
    return priorities.every(
      (p) => p === "low" || p === "medium" || p === "high",
    );
  });
}
