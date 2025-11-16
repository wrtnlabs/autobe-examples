import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test partial todo update functionality for the Todo application. Validates
 * that users can update specific fields of a todo item while preserving
 * unchanged values. Follows complete workflow: user registration, todo
 * creation, partial update validation, and verification of unchanged fields
 * preservation.
 */
export async function test_api_todo_partial_update(
  connection: api.IConnection,
) {
  // Step 1: Register user and establish authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      password_hash: "", // Empty hash as the API will handle hashing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create initial todo with complete data
  const initialTodo = await api.functional.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(initialTodo);

  // Step 3: Perform partial update - only update description
  const updatedDescription = "Updated description - partial update test";
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    connection,
    {
      todoId: initialTodo.id,
      body: {
        description: updatedDescription,
        // Title and due_date are intentionally omitted to test partial update
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Validate partial update results
  TestValidator.equals(
    "todo ID remains unchanged",
    updatedTodo.id,
    initialTodo.id,
  );
  TestValidator.equals(
    "title remains unchanged",
    updatedTodo.title,
    initialTodo.title,
  );
  TestValidator.equals(
    "description was updated",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "due_date remains unchanged",
    updatedTodo.due_date,
    initialTodo.due_date,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedTodo.updated_at,
    initialTodo.updated_at,
  );
}
