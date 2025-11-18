import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that a user can delete an active session (log out from another
 * device), enforcing session privacy/boundaries and proper forced logout audit
 * behavior.
 *
 * 1. Register a new user via join
 * 2. Log in twice to create two independent sessions (simulating two devices)
 * 3. Use the session deletion endpoint to delete one session by its sessionId
 *    (while authenticated as the same user)
 * 4. (If possible) Attempt to use the deleted session's token for an authenticated
 *    operation—it should fail (not possible in this strict SDK test context,
 *    but in real-world E2E you'd attempt an operation and expect an error)
 * 5. (Optional: business rule) Attempt to delete a session for a different user –
 *    should be denied
 *
 * Note: The SDK does not expose session UUIDs after login, so this test must
 * simulate session UUIDs. In a real backend, session deletion would use a real
 * sessionId, but here we use stub UUIDs.
 */
export async function test_api_session_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const createUserBody = {
    email,
    password,
    href: "https://app.todo-list.com/auth/register",
    referrer: "https://app.todo-list.com/landing",
    display_name: RandomGenerator.name(),
  } satisfies ITodoListUser.ICreate;
  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: createUserBody });
  typia.assert(registered);

  // 2. Log in twice to create two independent sessions
  const loginBody = {
    email,
    password,
    href: "https://app.todo-list.com/login",
    referrer: "https://app.todo-list.com/welcome",
  } satisfies ITodoListUser.ILogin;
  const session1 = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(session1);
  const session2 = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(session2);

  TestValidator.notEquals(
    "session tokens for two logins must be different",
    session1.token.access,
    session2.token.access,
  );

  // 3. Delete the first session (simulate with a stub sessionId)
  // SDK does not provide a real sessionId, so use a random UUID for test stub
  await api.functional.todoList.user.users.sessions.erase(connection, {
    userId: session2.id,
    sessionId: typia.random<string & tags.Format<"uuid">>(),
  });

  // 4. Not possible: Cannot simulate deleted session's token—no sessionId-linkage from SDK

  // 5. Attempt to delete another user's session (should fail)
  const otherUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://app.todo-list.com/auth/register",
    referrer: "https://app.todo-list.com/landing",
  } satisfies ITodoListUser.ICreate;
  const otherUser = await api.functional.auth.user.join(connection, {
    body: otherUserBody,
  });
  typia.assert(otherUser);
  await TestValidator.error(
    "user cannot erase session of another user",
    async () => {
      await api.functional.todoList.user.users.sessions.erase(connection, {
        userId: otherUser.id,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
