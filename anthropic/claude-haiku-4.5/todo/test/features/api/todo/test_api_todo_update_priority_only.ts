import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating only the priority field of a todo item.
 *
 * This test validates that the priority field can be independently updated
 * without affecting other todo properties. It verifies:
 *
 * 1. Creating a todo with an initial priority level
 * 2. Updating priority through all valid options ('low', 'medium', 'high')
 * 3. Setting priority to null to clear it
 * 4. Confirming other fields remain unchanged during priority updates
 * 5. Verifying updated_at timestamp is refreshed with each modification
 *
 * The test ensures partial update functionality works correctly for the
 * priority field specifically.
 */
export async function test_api_todo_update_priority_only(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create initial todo with 'medium' priority
  const initialTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(initialTodo);

  TestValidator.equals(
    "initial priority is medium",
    initialTodo.priority,
    "medium",
  );
  TestValidator.equals("todo is not completed", initialTodo.completed, false);

  // Step 3: Update priority to 'low' and verify other fields unchanged
  const updatedToLow: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        priority: "low",
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedToLow);

  TestValidator.equals("priority updated to low", updatedToLow.priority, "low");
  TestValidator.equals(
    "title unchanged after priority update",
    updatedToLow.title,
    initialTodo.title,
  );
  TestValidator.equals(
    "description unchanged after priority update",
    updatedToLow.description,
    initialTodo.description,
  );
  TestValidator.equals(
    "completed status unchanged",
    updatedToLow.completed,
    initialTodo.completed,
  );
  TestValidator.notEquals(
    "updated_at refreshed on priority change",
    updatedToLow.updated_at,
    initialTodo.updated_at,
  );

  // Step 4: Update priority to 'high'
  const updatedToHigh: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        priority: "high",
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedToHigh);

  TestValidator.equals(
    "priority updated to high",
    updatedToHigh.priority,
    "high",
  );
  TestValidator.equals(
    "title still unchanged",
    updatedToHigh.title,
    initialTodo.title,
  );
  TestValidator.notEquals(
    "updated_at refreshed again",
    updatedToHigh.updated_at,
    updatedToLow.updated_at,
  );

  // Step 5: Update priority back to 'medium'
  const updatedToMediumAgain: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        priority: "medium",
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedToMediumAgain);

  TestValidator.equals(
    "priority back to medium",
    updatedToMediumAgain.priority,
    "medium",
  );

  // Step 6: Clear priority by setting to null
  const priorityCleared: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        priority: null,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(priorityCleared);

  TestValidator.equals(
    "priority cleared to null",
    priorityCleared.priority,
    null,
  );
  TestValidator.equals(
    "title remains unchanged after clearing priority",
    priorityCleared.title,
    initialTodo.title,
  );
  TestValidator.notEquals(
    "updated_at refreshed when clearing priority",
    priorityCleared.updated_at,
    updatedToMediumAgain.updated_at,
  );
}
