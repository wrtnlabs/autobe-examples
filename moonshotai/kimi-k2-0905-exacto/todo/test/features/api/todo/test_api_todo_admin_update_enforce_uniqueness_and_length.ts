import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";

/**
 * Validates that admin updates to todo descriptions enforce uniqueness and
 * length constraints
 *
 * This test confirms that an administrator is prevented from violating core
 * business rules when updating a user's todo description:
 *
 * 1. Description must be unique among the user's todos (no duplicates)
 * 2. Description cannot exceed 255 characters
 * 3. Description cannot be empty or consist solely of whitespace
 *
 * Steps:
 *
 * 1. Register and authenticate as admin
 * 2. Create two distinct todos for the same user using admin privilege
 * 3. Attempt to update the second todo to have the same description as the first -
 *    expect rejection
 * 4. Attempt to update description to a string longer than 255 characters - expect
 *    rejection
 * 5. Attempt to update description to an empty string - expect rejection
 * 6. Attempt to update description to a whitespace-only string - expect rejection
 */
export async function test_api_todo_admin_update_enforce_uniqueness_and_length(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string,
      href: "https://test-suite.local/register",
      referrer: "https://test-suite.local/",
      ip: null,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create two distinct todos as different records
  // For test purposes, create user-contextless todos via admin logic (simulate user's todos)
  // We'll generate unique UUIDs for each
  // But since the update endpoint is admin-only, and no creation endpoint is available in the template, we will simulate creating them via repeated update with different IDs
  // Create one base todo
  const baseDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });
  const todo1Id = typia.random<string & tags.Format<"uuid">>();
  const todo1 = await api.functional.todoList.admin.todos.update(connection, {
    todoId: todo1Id,
    body: { description: baseDescription } satisfies ITodoListTodo.IUpdate,
  });
  typia.assert(todo1);
  TestValidator.equals(
    "admin set initial todo1 description",
    todo1.description,
    baseDescription,
  );

  // Create second todo with different description
  const todo2Id = typia.random<string & tags.Format<"uuid">>();
  const todo2 = await api.functional.todoList.admin.todos.update(connection, {
    todoId: todo2Id,
    body: {
      description: RandomGenerator.paragraph({
        sentences: 6,
        wordMin: 3,
        wordMax: 7,
      }),
    } satisfies ITodoListTodo.IUpdate,
  });
  typia.assert(todo2);

  // 3. Attempt to update todo2 description to a duplicate value (the same as todo1's)
  await TestValidator.error(
    "should reject duplicate description for same user",
    async () => {
      await api.functional.todoList.admin.todos.update(connection, {
        todoId: todo2Id,
        body: { description: baseDescription } satisfies ITodoListTodo.IUpdate,
      });
    },
  );

  // 4. Attempt to update with overlong description (>255 chars)
  const longDescription = RandomGenerator.paragraph({
    sentences: 100,
    wordMin: 5,
    wordMax: 7,
  });
  await TestValidator.error(
    "should reject description exceeding 255 characters",
    async () => {
      await api.functional.todoList.admin.todos.update(connection, {
        todoId: todo2Id,
        body: {
          description: longDescription.substring(0, 256),
        } satisfies ITodoListTodo.IUpdate,
      });
    },
  );

  // 5. Attempt to update with empty string description
  await TestValidator.error(
    "should reject empty string description",
    async () => {
      await api.functional.todoList.admin.todos.update(connection, {
        todoId: todo2Id,
        body: { description: "" } satisfies ITodoListTodo.IUpdate,
      });
    },
  );

  // 6. Attempt to update with whitespace-only description
  await TestValidator.error(
    "should reject whitespace-only description",
    async () => {
      await api.functional.todoList.admin.todos.update(connection, {
        todoId: todo2Id,
        body: { description: "   \t  " } satisfies ITodoListTodo.IUpdate,
      });
    },
  );
}
