import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieving a todo item that was created with minimal required fields.
 *
 * This test validates that the API correctly handles and returns null values
 * for optional fields when a todo is created with only the required title
 * field. It ensures that nullable fields (description, priority, due_date,
 * completed_at, deleted_at) are explicitly returned as null rather than omitted
 * from the response.
 *
 * Test Flow:
 *
 * 1. Create authenticated user account
 * 2. Create minimal todo with only title field
 * 3. Retrieve the created todo by ID
 * 4. Validate that all nullable optional fields are explicitly null
 * 5. Verify required fields have proper values
 */
export async function test_api_todo_retrieval_with_null_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(authorizedUser);

  // Step 2: Create minimal todo with only required title field
  const minimalTodoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: minimalTodoTitle,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve the created todo by ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Validate that nullable optional fields are explicitly null
  TestValidator.equals(
    "description should be null",
    retrievedTodo.description,
    null,
  );
  TestValidator.equals("priority should be null", retrievedTodo.priority, null);
  TestValidator.equals("due_date should be null", retrievedTodo.due_date, null);
  TestValidator.equals(
    "completed_at should be null",
    retrievedTodo.completed_at,
    null,
  );
  TestValidator.equals(
    "deleted_at should be null",
    retrievedTodo.deleted_at,
    null,
  );

  // Step 5: Verify required fields have proper values
  TestValidator.equals("todo ID matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals("title matches", retrievedTodo.title, minimalTodoTitle);
  TestValidator.predicate(
    "completed is boolean",
    typeof retrievedTodo.completed === "boolean",
  );
  TestValidator.predicate(
    "status is valid",
    ["pending", "in_progress", "completed", "cancelled"].includes(
      retrievedTodo.status,
    ),
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedTodo.updated_at.length > 0,
  );
}
