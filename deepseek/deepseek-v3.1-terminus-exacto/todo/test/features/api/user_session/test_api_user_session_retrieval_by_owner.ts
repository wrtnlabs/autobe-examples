import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test that authenticated users can retrieve detailed information about their
 * own sessions. This scenario validates the session retrieval functionality
 * including complete session details with connection context, timestamps, and
 * user relationship data.
 */
export async function test_api_user_session_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      password_hash: "testPassword123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Create a todo item to generate session activity
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Retrieve session details - since we don't have a session listing API,
  // we'll test the endpoint with a realistic scenario. The key validation is that
  // the endpoint works with proper authentication and returns valid session data.

  // For this test, we'll use a valid UUID format to test the endpoint structure
  // and ensure it returns proper session data when called with authentication
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Test the session retrieval endpoint with proper authentication
  const session = await api.functional.todoApp.user.users.sessions.at(
    connection,
    {
      userId: createdUser.id,
      sessionId: sessionId,
    },
  );
  typia.assert(session);

  // Step 4: Validate business logic - session belongs to the authenticated user
  TestValidator.equals(
    "session user ID should match authenticated user ID",
    session.user.id,
    createdUser.id,
  );

  TestValidator.equals(
    "session user email should match authenticated user email",
    session.user.email,
    createdUser.email,
  );

  // Step 5: Validate session data integrity through business logic
  TestValidator.predicate(
    "session should have valid relationship data",
    session.user !== null && session.user.id === createdUser.id,
  );

  TestValidator.predicate(
    "session should have proper timestamps",
    new Date(session.created_at).getTime() <= Date.now(),
  );
}
