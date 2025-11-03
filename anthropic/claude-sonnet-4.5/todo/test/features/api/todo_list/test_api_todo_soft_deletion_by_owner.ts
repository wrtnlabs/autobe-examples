import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the soft deletion workflow for todo items owned by authenticated users.
 *
 * This test validates the complete soft deletion process including user
 * authentication, todo creation, soft deletion execution, and verification of
 * the deleted state. The soft delete operation sets the deleted_at timestamp
 * while preserving all other data, enabling potential recovery features and
 * maintaining audit trails.
 *
 * Test Flow:
 *
 * 1. Register a new user account and establish authentication context
 * 2. Create a todo item that will be soft deleted
 * 3. Perform soft deletion on the todo item
 * 4. Verify that deleted_at is set to current timestamp
 * 5. Verify all other fields remain unchanged
 */
export async function test_api_todo_soft_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    });
  typia.assert(registeredUser);

  // Step 2: Create a todo item to be soft deleted
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Verify the todo was created without deletion timestamp
  TestValidator.predicate(
    "created todo should not be deleted",
    createdTodo.deleted_at === null || createdTodo.deleted_at === undefined,
  );

  // Step 3: Perform soft deletion on the todo item
  const deletedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.erase(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(deletedTodo);

  // Step 4: Verify that deleted_at timestamp is set
  TestValidator.predicate(
    "deleted_at should be set after soft deletion",
    deletedTodo.deleted_at !== null && deletedTodo.deleted_at !== undefined,
  );

  // Step 5: Verify all other fields remain unchanged
  TestValidator.equals(
    "todo ID should remain unchanged",
    deletedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo user ID should remain unchanged",
    deletedTodo.todo_list_user_id,
    createdTodo.todo_list_user_id,
  );
  TestValidator.equals(
    "todo title should remain unchanged",
    deletedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description should remain unchanged",
    deletedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo status should remain unchanged",
    deletedTodo.status,
    createdTodo.status,
  );
  TestValidator.equals(
    "todo created_at should remain unchanged",
    deletedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "todo updated_at should remain unchanged",
    deletedTodo.updated_at,
    createdTodo.updated_at,
  );
}
