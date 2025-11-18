import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestSession";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_guest_session_retrieval_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Authenticate user with POST /auth/user/join
  const userAuth: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(6) + "@example.com",
        name: RandomGenerator.name(),
      } satisfies ITodoListTodoListUser.ICreate,
    });
  typia.assert(userAuth);

  // 2. Create a todoListGuest with POST /todoList/todoListGuests
  const guestCreateBody = {
    visitor_ip: [
      RandomGenerator.pick(["123", "192", "10", "172"] as const),
      ".",
      RandomGenerator.pick(["0", "168", "16", "254"] as const),
      ".",
      RandomGenerator.pick(["0", "1", "255"] as const),
      ".",
      String(Math.floor(Math.random() * 255)),
    ].join(""),
  } satisfies ITodoListGuest.ICreate;

  const guest: ITodoListGuest =
    await api.functional.todoList.todoListGuests.create(connection, {
      body: guestCreateBody,
    });
  typia.assert(guest);

  // 3. Create a todoListGuestSession with POST /todoList/user/todoListGuests/{todoListGuestId}/todoListGuestSessions
  const sessionCreateBody = {
    ip: guest.visitor_ip,
    href: "https://example.com/todolist",
    referrer: "https://referrer.com/page",
    created_at: new Date().toISOString(),
    expired_at: null,
  } satisfies ITodoListGuestSession.ICreate;

  const session: ITodoListGuestSession =
    await api.functional.todoList.user.todoListGuests.todoListGuestSessions.create(
      connection,
      {
        todoListGuestId: guest.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 4. Retrieve the todoListGuestSession by GET /todoList/user/todoListGuests/{todoListGuestId}/todoListGuestSessions/{id}
  const retrieved: ITodoListGuestSession =
    await api.functional.todoList.user.todoListGuests.todoListGuestSessions.at(
      connection,
      {
        todoListGuestId: guest.id,
        id: session.id,
      },
    );
  typia.assert(retrieved);

  // Validate that the retrieved session matches the created session
  TestValidator.equals(
    "todoListGuestSession.id matches",
    retrieved.id,
    session.id,
  );
  TestValidator.equals(
    "todoListGuestSession.todoListGuestId matches",
    retrieved.todo_list_guest_id,
    guest.id,
  );
  TestValidator.equals(
    "todoListGuestSession.ip matches",
    retrieved.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "todoListGuestSession.href matches",
    retrieved.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "todoListGuestSession.referrer matches",
    retrieved.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.equals(
    "todoListGuestSession.created_at matches",
    retrieved.created_at,
    sessionCreateBody.created_at,
  );
  TestValidator.equals(
    "todoListGuestSession.expired_at matches",
    retrieved.expired_at,
    sessionCreateBody.expired_at,
  );
}
