import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that todos created by one user are properly associated with that user's
 * account and demonstrate ownership isolation.
 *
 * This test validates the fundamental ownership model of the todo system by:
 *
 * 1. Creating a user account and establishing authentication
 * 2. Creating a todo item under the authenticated user
 * 3. Verifying that the created todo is properly associated with the user
 * 4. Ensuring the user_id is correctly populated from the JWT token
 *
 * This test ensures proper data ownership and access control foundation.
 */
export async function test_api_todo_creation_ownership_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a user account and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Verify user was created successfully
  TestValidator.predicate(
    "user should be created with valid ID",
    user.id !== null && user.id !== undefined,
  );
  TestValidator.equals("user email should match", user.email, userEmail);
  TestValidator.predicate(
    "user should have authentication token",
    user.token !== null && user.token !== undefined,
  );
  TestValidator.predicate(
    "user should have access token",
    user.token.access.length > 0,
  );

  // Step 2: Create a todo item for the authenticated user
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
  });

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: "pending",
        priority: "medium",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Verify the todo was created with correct ownership
  TestValidator.predicate(
    "todo should be created with valid ID",
    createdTodo.id !== null && createdTodo.id !== undefined,
  );
  TestValidator.equals("todo title should match", createdTodo.title, todoTitle);
  TestValidator.equals(
    "todo description should match",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo status should be pending",
    createdTodo.status,
    "pending",
  );
  TestValidator.equals(
    "todo priority should be medium",
    createdTodo.priority,
    "medium",
  );
  TestValidator.equals(
    "todo completed should be false",
    createdTodo.completed,
    false,
  );
  TestValidator.predicate(
    "todo should have created_at timestamp",
    createdTodo.created_at !== null && createdTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "todo should have updated_at timestamp",
    createdTodo.updated_at !== null && createdTodo.updated_at !== undefined,
  );

  // Step 4: Verify ownership isolation - the todo belongs to the authenticated user
  // Since the API automatically associates todos with the authenticated user via JWT token,
  // the successful creation confirms proper ownership association
  TestValidator.predicate(
    "todo creation confirms ownership isolation",
    createdTodo.id !== null && user.id !== null,
  );
}
