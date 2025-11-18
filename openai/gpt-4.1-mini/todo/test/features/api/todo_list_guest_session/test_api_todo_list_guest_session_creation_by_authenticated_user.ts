import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestSession";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_guest_session_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Create a new user account via /auth/user/join to authenticate and obtain a token
  const userCreateBody = {
    email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(authorizedUser);

  // 2. Create a new todo list guest via /todoList/todoListGuests
  const guestCreateBody = {
    visitor_ip: "203.0.113." + RandomGenerator.alphaNumeric(3),
  } satisfies ITodoListGuest.ICreate;

  const guest: ITodoListGuest =
    await api.functional.todoList.todoListGuests.create(connection, {
      body: guestCreateBody,
    });
  typia.assert(guest);

  TestValidator.predicate(
    "guest visitor_ip is non-empty string",
    typeof guest.visitor_ip === "string" && guest.visitor_ip.length > 0,
  );

  // 3. Create a todo list guest session associated with the created guest
  const nowISOString = new Date().toISOString();
  const guestSessionCreateBody = {
    ip: guestCreateBody.visitor_ip,
    href: `https://example.com/todo?guest=${guest.id}`,
    referrer: "https://google.com/search?q=todo+list+app",
    created_at: nowISOString,
    expired_at: null,
  } satisfies ITodoListGuestSession.ICreate;

  const guestSession: ITodoListGuestSession =
    await api.functional.todoList.user.todoListGuests.todoListGuestSessions.create(
      connection,
      {
        todoListGuestId: guest.id,
        body: guestSessionCreateBody,
      },
    );
  typia.assert(guestSession);

  // Validate that session is associated correctly with the guest
  TestValidator.equals(
    "guest session todo_list_guest_id matches guest id",
    guestSession.todo_list_guest_id,
    guest.id,
  );

  // Validate that IP address matches what was set
  TestValidator.equals(
    "guest session IP matches visitor_ip",
    guestSession.ip,
    guestCreateBody.visitor_ip,
  );

  // Validate href, referrer and timestamps for correctness and format
  TestValidator.equals(
    "guest session href is correct",
    guestSession.href,
    guestSessionCreateBody.href,
  );

  TestValidator.equals(
    "guest session referrer is correct",
    guestSession.referrer,
    guestSessionCreateBody.referrer,
  );

  TestValidator.equals(
    "guest session created_at matches",
    guestSession.created_at,
    guestSessionCreateBody.created_at,
  );

  TestValidator.equals(
    "guest session expired_at is null",
    guestSession.expired_at,
    null,
  );
}
