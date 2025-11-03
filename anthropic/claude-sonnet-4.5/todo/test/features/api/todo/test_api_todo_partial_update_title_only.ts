import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test partial update of todo item - modifying only the title field.
 *
 * This test validates that users can perform partial updates on todo items by
 * modifying only specific fields without affecting others. Creates a user
 * account and a todo item with complete information, then updates only the
 * title field while leaving description and status unchanged. Verifies that the
 * update succeeds, only the title is modified, and other fields retain their
 * original values.
 *
 * Test Flow:
 *
 * 1. Register a new user account
 * 2. Create a todo item with complete data (title, description, status)
 * 3. Update only the title field with a new value
 * 4. Validate that only the title changed while description and status remained
 *    the same
 * 5. Verify that updated_at timestamp was refreshed
 */
export async function test_api_todo_partial_update_title_only(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
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

  // Step 2: Create a todo item with complete information
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const originalDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const originalStatus = "incomplete" as const;

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
        status: originalStatus,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Perform partial update - modify only the title
  const newTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });

  const updatedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: {
        title: newTitle,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Validate the update results
  TestValidator.equals(
    "todo ID should remain unchanged",
    updatedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "title should be updated to new value",
    updatedTodo.title,
    newTitle,
  );
  TestValidator.equals(
    "description should remain unchanged",
    updatedTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedTodo.status,
    originalStatus,
  );
  TestValidator.equals(
    "user ID should remain unchanged",
    updatedTodo.todo_list_user_id,
    createdTodo.todo_list_user_id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedTodo.created_at,
    createdTodo.created_at,
  );

  // Step 5: Verify that updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at should be refreshed after update",
    new Date(updatedTodo.updated_at).getTime() >=
      new Date(createdTodo.updated_at).getTime(),
  );
}
