import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todo_list_user_session_detail_by_user(
  connection: api.IConnection,
) {
  // 1. Join a new TodoList user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinBody = {
    email,
    password: "password123",
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies ITodoListUser.ICreate;

  const authorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Create a user session for the authorized user
  const sessionBody = {
    ip: "192.168.1.100",
    href: "https://example.com/user/profile",
    referrer: "https://example.com",
    expiration: null,
  } satisfies ITodoListUserSession.ICreate;

  const session: ITodoListUserSession =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.createSession(
      connection,
      {
        userId: authorized.id,
        body: sessionBody,
      },
    );
  typia.assert(session);

  // 3. Retrieve detailed session information
  const sessionDetail: ITodoListUserSession =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.at(
      connection,
      {
        userId: authorized.id,
        sessionId: session.sessionId,
      },
    );
  typia.assert(sessionDetail);

  // 4. Validate the retrieved details match the created session
  TestValidator.equals("session userId", sessionDetail.userId, authorized.id);
  TestValidator.equals(
    "session sessionId",
    sessionDetail.sessionId,
    session.sessionId,
  );
  TestValidator.equals(
    "session IP address",
    sessionDetail.ipAddress,
    sessionBody.ip ?? "192.168.1.100",
  );
  TestValidator.equals("session URL", sessionDetail.url, sessionBody.href);
  TestValidator.equals(
    "session referrer URL",
    sessionDetail.referrerUrl,
    sessionBody.referrer ?? null,
  );
  TestValidator.equals("session isActive", sessionDetail.isActive, true);

  TestValidator.predicate(
    "session startTimestamp is a non-empty string",
    typeof sessionDetail.startTimestamp === "string" &&
      sessionDetail.startTimestamp.length > 0,
  );
  TestValidator.predicate(
    "session expirationTimestamp is null or string",
    sessionDetail.expirationTimestamp === null ||
      typeof sessionDetail.expirationTimestamp === "string",
  );
}
