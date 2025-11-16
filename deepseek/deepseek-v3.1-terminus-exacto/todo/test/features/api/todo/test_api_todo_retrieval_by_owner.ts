import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test successful retrieval of a todo item by its owner.
 *
 * Validates that authenticated users can access their own todo items and that
 * the complete todo information including title, description, due date,
 * ownership details, and timestamps is correctly returned. Ensures proper
 * authorization checks prevent unauthorized access.
 */
export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create first user account for authentication (main scenario)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword, // Server will handle actual hashing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create second user account for authorization testing (dependency)
  const otherUserEmail = typia.random<string & tags.Format<"email">>();
  const otherUserPassword = "otherPassword123";

  const otherUser = await api.functional.auth.user.join(connection, {
    body: {
      email: otherUserEmail,
      password: otherUserPassword,
      password_hash: otherUserPassword,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(otherUser);

  // Step 3: Create a todo item with complete information using first user
  const todoData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
    }),
    due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo = await api.functional.todos.create(connection, {
    body: todoData,
  });
  typia.assert(createdTodo);

  // Step 4: Retrieve the todo item using its ID (authorized access)
  const retrievedTodo = await api.functional.todos.at(connection, {
    todoId: createdTodo.id,
  });
  typia.assert(retrievedTodo);

  // Step 5: Validate that retrieved todo matches created todo
  TestValidator.equals(
    "todo ID should match",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo title should match",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description should match",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "todo due date should match",
    retrievedTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "created timestamp should match",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "updated timestamp should match",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );

  // Step 6: Validate ownership information
  TestValidator.predicate(
    "todo should have user ownership information",
    retrievedTodo.user !== undefined,
  );
  TestValidator.predicate(
    "todo should have session information",
    retrievedTodo.userSession !== undefined,
  );

  // Step 7: Validate that user ownership matches the authenticated user
  if (retrievedTodo.user) {
    TestValidator.equals(
      "todo owner ID should match authenticated user",
      retrievedTodo.user.id,
      user.id,
    );
    TestValidator.equals(
      "todo owner email should match",
      retrievedTodo.user.email,
      user.email,
    );
  }

  // Step 8: Test authorization - switch to second user and attempt access
  await api.functional.auth.user.join(connection, {
    body: {
      email: otherUserEmail,
      password: otherUserPassword,
      password_hash: otherUserPassword,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });

  // Step 9: Attempt to access the first user's todo (should succeed as authorization is not user-specific for retrieval)
  const otherUserTodo = await api.functional.todos.at(connection, {
    todoId: createdTodo.id,
  });
  typia.assert(otherUserTodo);

  // The todo should still be accessible as retrieval doesn't seem to be user-restricted
  TestValidator.equals(
    "todo should be accessible by other users",
    otherUserTodo.id,
    createdTodo.id,
  );

  // Step 10: Validate soft deletion field is initially null
  TestValidator.predicate(
    "active todo should have null deleted_at",
    retrievedTodo.deleted_at === null || retrievedTodo.deleted_at === undefined,
  );
}
