import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test todo creation with different priority levels.
 *
 * This test validates that the todo creation API correctly handles priority
 * values (low, medium, high) and enforces enum constraints. It creates three
 * separate todos with different priority levels, verifies they are stored
 * correctly, and confirms that the default priority (medium) is applied when
 * the priority field is omitted.
 *
 * Steps:
 *
 * 1. Register a new user account to obtain authentication token
 * 2. Create first todo with "low" priority level
 * 3. Create second todo with "medium" priority level
 * 4. Create third todo with "high" priority level
 * 5. Validate all three todos have correct priority values
 * 6. Create fourth todo without specifying priority to verify default
 * 7. Confirm the fourth todo defaults to "medium" priority
 */
export async function test_api_todo_creation_with_different_priority_levels(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userRegistration = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(10),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userRegistration);

  // Step 2: Create first todo with "low" priority
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
    "low priority todo has correct priority value",
    lowPriorityTodo.priority,
    "low",
  );

  // Step 3: Create second todo with "medium" priority
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
    "medium priority todo has correct priority value",
    mediumPriorityTodo.priority,
    "medium",
  );

  // Step 4: Create third todo with "high" priority
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
    "high priority todo has correct priority value",
    highPriorityTodo.priority,
    "high",
  );

  // Step 5: Validate all three todos have correct priority values
  TestValidator.predicate(
    "all priority values are set correctly",
    lowPriorityTodo.priority === "low" &&
      mediumPriorityTodo.priority === "medium" &&
      highPriorityTodo.priority === "high",
  );

  // Step 6: Create fourth todo without specifying priority to verify default
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

  // Step 7: Confirm the fourth todo defaults to "medium" priority
  TestValidator.equals(
    "default priority should be medium when not specified",
    defaultPriorityTodo.priority,
    "medium",
  );
}
