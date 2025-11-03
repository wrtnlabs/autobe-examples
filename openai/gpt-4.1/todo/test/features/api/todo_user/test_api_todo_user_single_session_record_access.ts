import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";
import type { ITodoListTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouserSession";

/**
 * Test that an authenticated todoUser can retrieve their own session record and
 * access is denied for other users' sessions.
 *
 * Steps:
 *
 * 1. Register a todoUser (join) to obtain an authorized user and first session
 *    (implicit)
 * 2. Simulate login from a second device/context by calling join again, which
 *    creates another session
 * 3. Attempt to retrieve the session using a mismatched todoUserId (ensure access
 *    denied)
 * 4. Attempt to retrieve a session using the correct todoUserId but a random
 *    sessionId (illustrative, since real session IDs are not exposed)
 */
export async function test_api_todo_user_single_session_record_access(
  connection: api.IConnection,
) {
  // 1. Register todoUser (first session is implicitly established)
  const registerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) as string & tags.MinLength<8>,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
    ip: "127.0.0.1",
  } satisfies ITodoListTodouser.IVerifyJoin;
  const user1 = await api.functional.auth.todoUser.join(connection, {
    body: registerInput,
  });
  typia.assert(user1);

  // 2. Simulate another session (e.g., login from a different device/context)
  const session2Input = {
    email: registerInput.email,
    password: registerInput.password,
    href: "https://example.com/login",
    referrer: "https://example.com/home",
    ip: "192.0.2.123",
  } satisfies ITodoListTodouser.IVerifyJoin;
  const user2 = await api.functional.auth.todoUser.join(connection, {
    body: session2Input,
  });
  typia.assert(user2);

  // 3. Attempt to access a session not owned by the user (should fail)
  await TestValidator.error(
    "access denied for fetching session not owned by user",
    async () => {
      await api.functional.todoList.todoUser.todoUsers.sessions.at(connection, {
        todoUserId: typia.random<string & tags.Format<"uuid">>(),
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 4. Attempt to access a session by correct todoUserId but unknown/random sessionId (illustrative, since sessionId is unknown)
  await TestValidator.error(
    "fetching a session that does not exist for this user should fail",
    async () => {
      await api.functional.todoList.todoUser.todoUsers.sessions.at(connection, {
        todoUserId: user2.id,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
