import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test partial updates to a todo item where only specific fields are modified
 * while others remain unchanged.
 *
 * This test validates that the update operation correctly applies only the
 * provided fields without affecting omitted fields. The test creates a user and
 * a todo with full details (title, description, status, priority, due_date),
 * then performs an update providing only a subset of fields (e.g., just title
 * and priority). It verifies that the specified fields are updated while all
 * other fields retain their original values.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new user
 * 2. Create a fully-populated todo item with all fields
 * 3. Perform partial update with only title and priority
 * 4. Verify updated fields changed correctly
 * 5. Verify non-updated fields retained original values
 */
export async function test_api_todo_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a fully-populated todo item
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalStatus = "in_progress" as const;
  const originalPriority = "high" as const;
  const originalDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const originalCompleted = false;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: originalTitle,
        description: originalDescription,
        status: originalStatus,
        priority: originalPriority,
        due_date: originalDueDate,
        completed: originalCompleted,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Verify creation was successful
  TestValidator.equals(
    "created todo title matches",
    createdTodo.title,
    originalTitle,
  );
  TestValidator.equals(
    "created todo description matches",
    createdTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "created todo status matches",
    createdTodo.status,
    originalStatus,
  );
  TestValidator.equals(
    "created todo priority matches",
    createdTodo.priority,
    originalPriority,
  );
  TestValidator.equals(
    "created todo due_date matches",
    createdTodo.due_date,
    originalDueDate,
  );
  TestValidator.equals(
    "created todo completed matches",
    createdTodo.completed,
    originalCompleted,
  );

  // Step 3: Perform partial update - only update title and priority
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedPriority = "low" as const;

  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: updatedTitle,
        priority: updatedPriority,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Verify updated fields changed correctly
  TestValidator.equals("title was updated", updatedTodo.title, updatedTitle);
  TestValidator.equals(
    "priority was updated",
    updatedTodo.priority,
    updatedPriority,
  );

  // Step 5: Verify non-updated fields retained original values
  TestValidator.equals(
    "description unchanged",
    updatedTodo.description,
    originalDescription,
  );
  TestValidator.equals("status unchanged", updatedTodo.status, originalStatus);
  TestValidator.equals(
    "due_date unchanged",
    updatedTodo.due_date,
    originalDueDate,
  );
  TestValidator.equals(
    "completed unchanged",
    updatedTodo.completed,
    originalCompleted,
  );

  // Verify system fields
  TestValidator.equals("todo ID unchanged", updatedTodo.id, createdTodo.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedTodo.created_at,
    createdTodo.created_at,
  );
}
