import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todo_list_user_session_creation_by_user(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: "password1234",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://referrer.example.com",
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(authorizedUser);

  // 2. Create a new session for the user
  const sessionCreateBody = {
    ip: "192.168.1.100",
    href: "https://example.com/todolist",
    referrer: "https://referrer.example.com",
  } satisfies ITodoListUserSession.ICreate;

  const userId = authorizedUser.id;

  const createdSession: ITodoListUserSession =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.createSession(
      connection,
      {
        userId: userId,
        body: sessionCreateBody,
      },
    );
  typia.assert(createdSession);

  // 3. Validate session properties
  TestValidator.equals(
    "session userId matches authorized user id",
    createdSession.userId,
    userId,
  );
  TestValidator.equals(
    "session IP address matches input",
    createdSession.ipAddress,
    sessionCreateBody.ip ?? "",
  );
  TestValidator.equals(
    "session URL matches href",
    createdSession.url,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "session referrer matches input",
    createdSession.referrerUrl ?? null,
    sessionCreateBody.referrer ?? null,
  );
  TestValidator.predicate("session is active", createdSession.isActive);
  TestValidator.predicate(
    "session start timestamp is valid ISO datetime",
    Boolean(Date.parse(createdSession.startTimestamp)),
  );
  if (
    createdSession.expirationTimestamp !== null &&
    createdSession.expirationTimestamp !== undefined
  ) {
    TestValidator.predicate(
      "session expiration timestamp is valid ISO datetime",
      Boolean(Date.parse(createdSession.expirationTimestamp)),
    );
  }
}
