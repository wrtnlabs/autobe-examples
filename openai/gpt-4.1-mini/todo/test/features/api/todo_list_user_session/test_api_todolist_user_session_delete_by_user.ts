import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todolist_user_session_delete_by_user(
  connection: api.IConnection,
) {
  // 1. Two user joins to establish authentication context
  const userCreate1: ITodoListUser.ICreate = {
    email: `user1_${RandomGenerator.alphaNumeric(4)}@test.com`,
    password: "password123",
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://referrer.com",
  };

  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userCreate1,
    },
  );
  typia.assert(user1);

  // 2. Create user session
  const sessionCreateBody: ITodoListUserSession.ICreate = {
    ip: "192.168.0.1",
    href: "https://example.com/dashboard",
    referrer: "https://example.com/home",
    expiration: null,
  };

  const session: ITodoListUserSession =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.createSession(
      connection,
      {
        userId: user1.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 3. Delete user session
  await api.functional.todoList.user.todoListUsers.todoListUserSessions.erase(
    connection,
    {
      userId: user1.id,
      sessionId: session.sessionId,
    },
  );

  // 4. Confirm deletion by attempting to delete again and expecting error
  await TestValidator.error(
    "delete already deleted session should fail",
    async () => {
      await api.functional.todoList.user.todoListUsers.todoListUserSessions.erase(
        connection,
        {
          userId: user1.id,
          sessionId: session.sessionId,
        },
      );
    },
  );
}
