import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test updating a todo item's title and completion status by the owner.
 *
 * This test validates the complete workflow of creating a user, authenticating,
 * creating a todo item, and then updating both its title and completion
 * status.
 *
 * Steps:
 *
 * 1. Create and authenticate a new user account
 * 2. Create a new todo item with initial title and incomplete status
 * 3. Update the todo item with a new title and mark it as completed
 * 4. Verify the updated todo reflects all changes correctly
 * 5. Validate that completed_at timestamp is populated when marked complete
 * 6. Verify updated_at timestamp reflects the modification time
 */
export async function test_api_todo_update_title_and_completion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const authenticatedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(authenticatedUser);

  // Step 2: Create a new todo item with initial title and incomplete status
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: initialTitle,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Verify initial state
  TestValidator.equals(
    "initial title matches",
    createdTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "initial completed status is false",
    createdTodo.completed,
    false,
  );
  TestValidator.equals(
    "initial completed_at is null",
    createdTodo.completed_at,
    null,
  );

  // Step 3: Update the todo item with a new title and mark it as completed
  const newTitle = RandomGenerator.paragraph({ sentences: 4 });

  const updatedTodo = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: {
        title: newTitle,
        completed: true,
      } satisfies ITodoListTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Verify the updated todo reflects all changes correctly
  TestValidator.equals(
    "todo ID remains the same",
    updatedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "updated title matches new title",
    updatedTodo.title,
    newTitle,
  );
  TestValidator.equals("completed status is true", updatedTodo.completed, true);

  // Step 5: Validate that completed_at timestamp is populated when marked complete
  TestValidator.predicate(
    "completed_at timestamp is populated",
    updatedTodo.completed_at !== null && updatedTodo.completed_at !== undefined,
  );

  // Step 6: Verify updated_at timestamp reflects the modification time
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedTodo.updated_at).getTime() >=
      new Date(createdTodo.updated_at).getTime(),
  );

  // Additional validation: Verify completed_at is a valid date-time format
  if (updatedTodo.completed_at) {
    typia.assert<string & tags.Format<"date-time">>(updatedTodo.completed_at);

    // Verify completed_at is a reasonable time (after creation)
    TestValidator.predicate(
      "completed_at is after or equal to created_at",
      new Date(updatedTodo.completed_at).getTime() >=
        new Date(createdTodo.created_at).getTime(),
    );
  }
}
