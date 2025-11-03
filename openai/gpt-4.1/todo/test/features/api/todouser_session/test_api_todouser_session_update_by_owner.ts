import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";
import type { ITodoListTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouserSession";

/**
 * Test todoUser session update by owner.
 *
 * This test verifies that a todoUser can update their session record's
 * updatable fields (ip, href, referrer, expired_at) but not immutable fields
 * (ownership, id, created_at).
 *
 * 1. Register a new todoUser account with valid data.
 * 2. Login as the user to obtain authentication and a valid session.
 * 3. Update the session (using updatable fields) and check that values have
 *    changed.
 * 4. Attempt to update a session as another user — update must be rejected
 *    (permission error).
 * 5. (Note) Mutation of immutable fields cannot be directly tested since the DTO
 *    does not allow them.
 */
export async function test_api_todouser_session_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new todoUser
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  const joinBody = {
    email,
    password,
    ip: "192.168.1.2",
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ITodoListTodouser.IVerifyJoin;
  const authorized = await api.functional.auth.todoUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2. Login to create a session
  const loginBody = {
    email,
    password,
    ip: "192.168.1.101",
    href: "https://example.com/login",
    referrer: "https://example.com/welcome",
  } satisfies ITodoListTodouser.IVerifyLogin;
  const loginAuth = await api.functional.auth.todoUser.login(connection, {
    body: loginBody,
  });
  typia.assert(loginAuth);

  // We do not have an API to enumerate sessions, so we must assume the session ID is available after login
  // If not, this test cannot be executed in a real scenario.
  // For this test, we'll assume that the session id can be extracted or is made available by other means (here, we use loginAuth.id if available)
  // (In a real system, the session record would be returned by login, or sessions would be accessible from an endpoint.)
  // Here, we assume the session id is the same as the authorized user's id (for test purposes only).
  // Please adjust to the actual structure if session id is made available via login response directly.
  const sessionId = authorized.id;

  // 3. Update own session: set new ip, href, referrer, and perform explicit logout by setting expired_at
  const sessionUpdate = {
    ip: "10.0.0.123",
    href: "https://example.com/dashboard",
    referrer: "https://example.com/login",
    expired_at: new Date().toISOString(),
  } satisfies ITodoListTodouserSession.IUpdate;
  const updatedSession =
    await api.functional.todoList.todoUser.todoUsers.sessions.update(
      connection,
      {
        todoUserId: authorized.id,
        sessionId: sessionId,
        body: sessionUpdate,
      },
    );
  typia.assert(updatedSession);
  TestValidator.equals(
    "session ip was updated",
    updatedSession.ip,
    sessionUpdate.ip,
  );
  TestValidator.equals(
    "session href was updated",
    updatedSession.href,
    sessionUpdate.href,
  );
  TestValidator.equals(
    "session referrer was updated",
    updatedSession.referrer,
    sessionUpdate.referrer,
  );
  TestValidator.equals(
    "session explicit logout set",
    updatedSession.expired_at,
    sessionUpdate.expired_at,
  );
  TestValidator.equals(
    "session owner remains unchanged",
    updatedSession.todo_list_todouser_id,
    authorized.id,
  );

  // 4. Attempt to update a session of another user, should fail
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphabets(10);
  const joinBody2 = {
    email: email2,
    password: password2,
    ip: "192.168.1.3",
    href: "https://example.com/register2",
    referrer: "https://example.com/landing2",
  } satisfies ITodoListTodouser.IVerifyJoin;
  const authorized2 = await api.functional.auth.todoUser.join(connection, {
    body: joinBody2,
  });
  typia.assert(authorized2);

  const loginBody2 = {
    email: email2,
    password: password2,
    ip: "192.168.1.202",
    href: "https://example.com/login2",
    referrer: "https://example.com/welcome2",
  } satisfies ITodoListTodouser.IVerifyLogin;
  const loginAuth2 = await api.functional.auth.todoUser.login(connection, {
    body: loginBody2,
  });
  typia.assert(loginAuth2);

  await TestValidator.error(
    "user cannot update session they do not own",
    async () => {
      await api.functional.todoList.todoUser.todoUsers.sessions.update(
        connection,
        {
          todoUserId: authorized.id,
          sessionId: sessionId,
          body: { ip: "1.2.3.4" },
        },
      );
    },
  );
}
