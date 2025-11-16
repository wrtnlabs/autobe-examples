import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListGuest";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todo_list_guest_todo_list_user_session_retrieval_by_guest(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as guest user to obtain access token and guest ID.
  const guestNewAccount: ITodoListTodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        nickname: RandomGenerator.name(2),
        client_version: `ver.${RandomGenerator.alphaNumeric(4)}`,
        ip: undefined,
        href: `https://example.com/start`,
        referrer: `https://referrer.com/home`,
      } satisfies ITodoListTodoListGuest.ICreate,
    });
  typia.assert(guestNewAccount);

  // Step 2: Retrieve the todo list user session by the guest ID
  const userSession: ITodoListUserSession =
    await api.functional.todoList.guest.todoListUserSessions.at(connection, {
      id: guestNewAccount.id,
    });

  // Assert the returned session data
  typia.assert(userSession);
  TestValidator.equals(
    "todo list user session id matches guest id",
    userSession.id,
    guestNewAccount.id,
  );
  TestValidator.predicate(
    "todo list user session created_at is ISO 8601",
    !isNaN(Date.parse(userSession.created_at)),
  );
  TestValidator.equals(
    "todo list user session href matches expected",
    userSession.href,
    `https://example.com/start`,
  );
  TestValidator.equals(
    "todo list user session referrer matches expected",
    userSession.referrer,
    `https://referrer.com/home`,
  );
  TestValidator.equals(
    "todo list user session todo_list_user_id matches guest id",
    userSession.todo_list_user_id,
    guestNewAccount.id,
  );
  if (userSession.expired_at !== null && userSession.expired_at !== undefined) {
    TestValidator.predicate(
      "todo list user session expired_at is ISO 8601",
      !isNaN(Date.parse(userSession.expired_at)),
    );
  }
  if (userSession.ip !== null && userSession.ip !== undefined) {
    TestValidator.predicate(
      "todo list user session ip is string if present",
      typeof userSession.ip === "string",
    );
  }
}
