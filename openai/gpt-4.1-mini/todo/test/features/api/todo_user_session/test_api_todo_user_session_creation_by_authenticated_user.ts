import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

/**
 * Test the creation of a new session for an existing todo user.
 *
 * This test covers the complete user journey:
 *
 * 1. Register a new user with email and password.
 * 2. Pre-create a todo user account using the same email.
 * 3. Authenticate the user and create a session with detailed metadata.
 *
 * Validations:
 *
 * - The authorized user returned from /auth/user/join must have a valid UUID and
 *   a token.
 * - The todo user created must match the email used for registration.
 * - The session created for the user must have metadata matching the request and
 *   be linked to correct user ID.
 * - All responses are validated by typia.assert for complete runtime type
 *   validation.
 */
export async function test_api_todo_user_session_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1. Register a new user with email and password
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email,
        password: "Secret1234!",
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(authorized);

  // Pre-create todo user explicitly for session creation test (dependency)
  // Remove if unnecessary (if user join creates todo user automatically)
  const todoUser: ITodoUser = await api.functional.todo.todoUsers.create(
    connection,
    {
      body: {
        email: email,
        password: "Secret1234!",
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(todoUser);
  TestValidator.equals("todo user email equals", todoUser.email, email);

  // Step 2. Create a new session for the todo user
  const sessionCreateBody = {
    ip: "192.168.0.1",
    href: `https://example.com/dashboard?user=${encodeURIComponent(email)}`,
    referrer: "https://google.com/search?q=todo+app",
  } satisfies ITodoUserSession.ICreate;

  const session: ITodoUserSession =
    await api.functional.todo.user.todoUsers.sessions.create(connection, {
      todoUserEmail: email,
      body: sessionCreateBody,
    });
  typia.assert(session);

  TestValidator.equals(
    "session todo_user_id matches authorized user id",
    session.todo_user_id,
    authorized.id,
  );
  TestValidator.equals("session ip equals", session.ip, sessionCreateBody.ip);
  TestValidator.equals(
    "session href equals",
    session.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "session referrer equals",
    session.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.predicate(
    "session created_at is iso date",
    typeof session.created_at === "string" && session.created_at.length > 10,
  );
}
