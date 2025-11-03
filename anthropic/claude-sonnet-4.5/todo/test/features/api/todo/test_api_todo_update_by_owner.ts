import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the complete workflow of updating a todo item by its owner.
 *
 * This test validates the core todo management functionality enabling users to
 * maintain and refine their task information as needs evolve. The test ensures
 * that users can successfully modify their todo items while preserving data
 * integrity and enforcing proper ownership controls.
 *
 * Test workflow:
 *
 * 1. Create new user account via registration to establish authentication context
 * 2. Create initial todo item with specific title and description
 * 3. Update the todo item by modifying title, description, and completion status
 * 4. Verify update operation succeeded with all fields correctly modified
 * 5. Verify created_at timestamp remains unchanged (immutable)
 * 6. Verify updated_at timestamp is refreshed to reflect modification time
 * 7. Verify user ownership integrity is maintained
 */
export async function test_api_todo_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register new user account to establish authentication context
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

  // Step 2: Create initial todo item with specific values
  const initialTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const initialDescription = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 12,
  });

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Verify initial todo creation
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
    "incomplete",
  );
  TestValidator.equals(
    "owner is authenticated user",
    createdTodo.todo_list_user_id,
    registeredUser.id,
  );

  // Store original timestamps for later comparison
  const originalCreatedAt = createdTodo.created_at;
  const originalUpdatedAt = createdTodo.updated_at;

  // Step 3: Update todo item with new values
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 6,
    wordMax: 11,
  });
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 6,
    wordMax: 10,
  });

  const updatedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        status: "complete",
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Verify all fields were updated correctly
  TestValidator.equals(
    "updated title matches new value",
    updatedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated description matches new value",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "status changed to complete",
    updatedTodo.status,
    "complete",
  );

  // Step 5: Verify created_at timestamp remains unchanged (immutable)
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedTodo.created_at,
    originalCreatedAt,
  );

  // Step 6: Verify updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    new Date(updatedTodo.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 7: Verify user ownership integrity maintained
  TestValidator.equals(
    "user ownership preserved",
    updatedTodo.todo_list_user_id,
    registeredUser.id,
  );

  // Step 8: Verify todo ID remains the same
  TestValidator.equals("todo ID unchanged", updatedTodo.id, createdTodo.id);
}
