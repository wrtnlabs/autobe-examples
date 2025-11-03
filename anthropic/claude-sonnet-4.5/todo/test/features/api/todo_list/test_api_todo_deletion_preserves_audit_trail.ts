import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that soft deletion preserves complete todo data for audit purposes.
 *
 * This test validates the soft deletion mechanism by:
 *
 * 1. Creating a user account and authenticating
 * 2. Creating a todo item with specific initial values
 * 3. Soft deleting the todo item
 * 4. Verifying that deleted_at is set and all original data is preserved in the
 *    response
 *
 * The test ensures that soft deletion properly marks items as deleted while
 * preserving all original field values, supporting audit trails and compliance
 * requirements.
 */
export async function test_api_todo_deletion_preserves_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.IRegister,
  });
  typia.assert(registeredUser);

  // Step 2: Create a todo item with specific initial values
  const initialTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const initialDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const initialStatus = "incomplete" as const;

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
        status: initialStatus,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Verify initial todo values
  TestValidator.equals(
    "initial title matches",
    createdTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "initial description matches",
    createdTodo.description,
    initialDescription,
  );
  TestValidator.equals(
    "initial status is incomplete",
    createdTodo.status,
    initialStatus,
  );
  TestValidator.equals(
    "deleted_at is initially null",
    createdTodo.deleted_at,
    null,
  );
  TestValidator.equals(
    "todo belongs to authenticated user",
    createdTodo.todo_list_user_id,
    registeredUser.id,
  );

  // Record the original timestamps
  const originalCreatedAt = createdTodo.created_at;
  const originalUpdatedAt = createdTodo.updated_at;

  // Step 3: Perform soft deletion on the todo item
  const deletedTodo = await api.functional.todoList.user.todos.erase(
    connection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(deletedTodo);

  // Step 4: Verify soft deletion preserves all original data
  // Check that deleted_at timestamp is set
  TestValidator.predicate(
    "deleted_at timestamp is set after deletion",
    deletedTodo.deleted_at !== null && deletedTodo.deleted_at !== undefined,
  );

  // Verify all original field values are preserved in the deletion response
  TestValidator.equals(
    "todo ID preserved after deletion",
    deletedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "title preserved after deletion",
    deletedTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "description preserved after deletion",
    deletedTodo.description,
    initialDescription,
  );
  TestValidator.equals(
    "status preserved after deletion",
    deletedTodo.status,
    initialStatus,
  );

  // Verify referential integrity is maintained
  TestValidator.equals(
    "user ownership preserved after deletion",
    deletedTodo.todo_list_user_id,
    registeredUser.id,
  );

  // Verify original timestamps are preserved
  TestValidator.equals(
    "created_at timestamp preserved",
    deletedTodo.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "updated_at timestamp preserved",
    deletedTodo.updated_at,
    originalUpdatedAt,
  );

  // Verify deleted_at is a valid date-time string
  typia.assert<string & tags.Format<"date-time">>(deletedTodo.deleted_at!);
}
