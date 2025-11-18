import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test soft deletion of a todo item by its owner.
 *
 * This test validates the soft deletion mechanism for todo items in the system.
 * Soft deletion marks records as deleted using a timestamp rather than
 * physically removing them from the database, preserving data for audit trail
 * purposes.
 *
 * Workflow:
 *
 * 1. Create and authenticate a new user account
 * 2. Create a todo item owned by the authenticated user
 * 3. Delete the todo item using the DELETE endpoint
 * 4. Verify that the deleted todo is returned with deleted_at timestamp populated
 *
 * The test confirms that:
 *
 * - The delete operation succeeds and returns the todo data
 * - The deleted_at field is set to a valid ISO 8601 timestamp (not
 *   null/undefined)
 * - The todo record is preserved with the deletion marker for historical tracking
 */
export async function test_api_todo_delete_soft_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo item
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Verify initial state: todo should not be deleted
  TestValidator.equals(
    "created todo should not have deleted_at set",
    createdTodo.deleted_at,
    null,
  );

  // Step 3: Delete the todo item (soft delete)
  const deletedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.erase(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(deletedTodo);

  // Step 4: Validate soft deletion - deleted_at should be populated
  TestValidator.predicate(
    "deleted todo must have deleted_at timestamp",
    deletedTodo.deleted_at !== null && deletedTodo.deleted_at !== undefined,
  );

  // Verify the deleted_at is a valid date-time string
  if (deletedTodo.deleted_at) {
    typia.assert<string & tags.Format<"date-time">>(deletedTodo.deleted_at);
  }

  // Verify the todo ID matches
  TestValidator.equals(
    "deleted todo ID should match created todo ID",
    deletedTodo.id,
    createdTodo.id,
  );

  // Verify the todo title is preserved
  TestValidator.equals(
    "deleted todo title should be preserved",
    deletedTodo.title,
    todoTitle,
  );
}
