import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the complete workflow of a user marking their todo item as complete.
 *
 * This test validates the core todo completion functionality by:
 *
 * 1. Creating a new user account through registration
 * 2. Creating a todo item for that user
 * 3. Marking the todo as complete
 * 4. Verifying the status change and timestamp update
 *
 * The test ensures that users can successfully track their task progress by
 * completing todo items, with proper status transitions and metadata updates.
 */
export async function test_api_todo_completion_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through registration
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: registrationData,
    },
  );
  typia.assert(user);

  // Verify user registration succeeded with authentication tokens
  TestValidator.predicate(
    "user should have valid authentication tokens",
    user.token.access.length > 0 && user.token.refresh.length > 0,
  );

  // Step 2: Create a todo item for the authenticated user
  const todoData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoData,
    });
  typia.assert(createdTodo);

  // Verify todo was created with incomplete status
  TestValidator.equals(
    "todo should have incomplete status",
    createdTodo.status,
    "incomplete",
  );
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoData.title,
  );
  TestValidator.equals(
    "todo description matches input",
    createdTodo.description,
    todoData.description,
  );
  TestValidator.equals(
    "todo belongs to authenticated user",
    createdTodo.todo_list_user_id,
    user.id,
  );

  // Step 3: Mark the todo as complete
  const completedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);

  // Step 4: Verify the todo status changed to complete
  TestValidator.equals(
    "todo status should be complete",
    completedTodo.status,
    "complete",
  );

  // Verify the updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at should be refreshed after completion",
    new Date(completedTodo.updated_at).getTime() >=
      new Date(createdTodo.updated_at).getTime(),
  );

  // Verify all other properties remain unchanged
  TestValidator.equals(
    "todo ID remains unchanged",
    completedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo title remains unchanged",
    completedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description remains unchanged",
    completedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo user ownership remains unchanged",
    completedTodo.todo_list_user_id,
    createdTodo.todo_list_user_id,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    completedTodo.created_at,
    createdTodo.created_at,
  );
}
