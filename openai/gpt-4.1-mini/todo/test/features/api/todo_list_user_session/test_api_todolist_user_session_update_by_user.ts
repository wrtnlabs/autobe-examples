import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todolist_user_session_update_by_user(
  connection: api.IConnection,
) {
  // 1. Create a new todo list user by calling auth user join
  const joinBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPass123!",
    ip: null,
    href: "https://example.com/register",
    referrer: "https://google.com",
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(authorizedUser);
  TestValidator.predicate(
    "authorized user id is uuid",
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      authorizedUser.id,
    ),
  );

  // 2. Create a new user session for the authorized user
  const sessionCreateBody = {
    ip: "192.168.1.100",
    href: "https://example.com/dashboard",
    referrer: "https://example.com/login",
    expiration: null,
  } satisfies ITodoListUserSession.ICreate;

  const createdSession: ITodoListUserSession =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.createSession(
      connection,
      { userId: authorizedUser.id, body: sessionCreateBody },
    );
  typia.assert(createdSession);
  TestValidator.equals(
    "created session userId",
    createdSession.userId,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "created session ip address valid",
    /^\b(\d{1,3}\.){3}\d{1,3}\b$/.test(createdSession.ipAddress),
  );

  // 3. Update the existing session with new IP and referrer
  const updateBody = {
    ip: "10.0.0.2",
    referrer: "https://example.com/home",
    href: "https://example.com/dashboard",
    expiration: null,
  } satisfies ITodoListUserSession.IUpdate;

  const updatedSession: ITodoListUserSession =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.updateSession(
      connection,
      {
        userId: authorizedUser.id,
        sessionId: createdSession.sessionId,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // 4. Validate that updated fields are reflected correctly
  TestValidator.equals(
    "updated session userId",
    updatedSession.userId,
    authorizedUser.id,
  );
  TestValidator.equals(
    "updated session IP address",
    updatedSession.ipAddress,
    updateBody.ip!,
  );
  TestValidator.equals(
    "updated session referrer",
    updatedSession.referrerUrl!,
    updateBody.referrer!,
  );
  TestValidator.equals(
    "updated session href",
    updatedSession.url,
    updateBody.href!,
  );
  TestValidator.predicate("updated session is active", updatedSession.isActive);
}
