import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_update_multiple_fields_simultaneously(
  connection: api.IConnection,
) {
  // 1. Register user for authentication
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // 2. Create initial todo with minimal fields
  const initialTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Initial Todo Title",
        description: "Initial description",
        priority: "low",
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(initialTodo);

  // 3. Update multiple fields simultaneously
  const futureDate = new Date(Date.now() + 172800000).toISOString();
  const updatedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: initialTodo.id,
      body: {
        title: "Updated Todo Title",
        description: "Updated description with more details",
        priority: "high",
        due_date: futureDate,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // 4. Verify all fields were updated correctly
  TestValidator.equals(
    "title should be updated",
    updatedTodo.title,
    "Updated Todo Title",
  );
  TestValidator.equals(
    "description should be updated",
    updatedTodo.description,
    "Updated description with more details",
  );
  TestValidator.equals(
    "priority should be updated",
    updatedTodo.priority,
    "high",
  );
  TestValidator.equals(
    "due_date should be updated",
    updatedTodo.due_date,
    futureDate,
  );

  // 5. Verify updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at should be refreshed after update",
    updatedTodo.updated_at !== initialTodo.updated_at,
  );

  // 6. Verify completion status remained unchanged
  TestValidator.equals(
    "completion status should remain unchanged",
    updatedTodo.completed,
    initialTodo.completed,
  );
}
