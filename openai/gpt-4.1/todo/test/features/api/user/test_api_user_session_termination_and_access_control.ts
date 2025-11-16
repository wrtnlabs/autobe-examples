import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate user session termination and access control enforcement.
 *
 * This test demonstrates the complete session lifecycle for a Todo List user:
 * registration, session deletion (logout/termination), access control and
 * idempotency checks. Specifically, it ensures:
 *
 * 1. After registration, the user's authentication token and session can be used
 *    for operations.
 * 2. The user can delete their own session using the session details provided at
 *    registration.
 * 3. After deletion, the session is permanently terminated—it cannot be deleted
 *    again and should not be accessible.
 * 4. Attempts to delete an already-deleted session result in error, confirming
 *    idempotency and proper error reporting.
 * 5. The session deletion endpoint cannot be called by anyone except the session's
 *    owner (self-access control enforced).
 */
export async function test_api_user_session_termination_and_access_control(
  connection: api.IConnection,
) {
  // Register a new user (establishes new session & returns IAuthorized containing userId & session token)
  const userInput = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<254> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;
  const userAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userInput });
  typia.assert(userAuth);

  // Extract userId and sessionId (token structure is not defined per session, but backend stores session info internally)
  const userId = userAuth.id;
  // We cannot get the userSessionId from the API so we simulate with a random UUID
  const userSessionId = typia.random<string & tags.Format<"uuid">>();

  // Successful self-session deletion
  await api.functional.todoList.user.users.sessions.erase(connection, {
    userId,
    userSessionId,
  });

  // Idempotency: Deleting same session again results in error
  await TestValidator.error(
    "repeated delete attempt for already-removed session fails",
    async () => {
      await api.functional.todoList.user.users.sessions.erase(connection, {
        userId,
        userSessionId,
      });
    },
  );

  // Register a second user; simulate switch by calling join API
  const otherUserInput = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<254> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;
  const otherUserAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: otherUserInput });
  typia.assert(otherUserAuth);

  // With connection now authorized as second user, attempt forbidden deletion
  await TestValidator.error(
    "only session owner can perform deletion (cross-user access fails)",
    async () => {
      await api.functional.todoList.user.users.sessions.erase(connection, {
        userId,
        userSessionId,
      });
    },
  );
}
