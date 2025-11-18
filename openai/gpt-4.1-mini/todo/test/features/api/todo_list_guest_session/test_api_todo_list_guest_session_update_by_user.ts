import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestSession";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_guest_session_update_by_user(
  connection: api.IConnection,
) {
  // Step 1: User registration for authorization
  const userCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const user: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreate,
    });
  typia.assert(user);

  // Step 2: Create a Guest user
  const guestCreate = {
    visitor_ip: RandomGenerator.pick([
      "192.168.1.100",
      "10.0.0.110",
      "172.16.0.5",
    ] as const),
  } satisfies ITodoListGuest.ICreate;

  const guest: ITodoListGuest =
    await api.functional.todoList.todoListGuests.create(connection, {
      body: guestCreate,
    });
  typia.assert(guest);

  // Step 3: Create a Guest Session for the guest
  const sessionCreate = {
    ip: guest.visitor_ip,
    href: `https://example.com/page/${RandomGenerator.alphabets(5)}`,
    referrer: `https://referrer.com/page/${RandomGenerator.alphabets(5)}`,
    created_at: new Date().toISOString(),
    expired_at: null,
  } satisfies ITodoListGuestSession.ICreate;

  const guestSession: ITodoListGuestSession =
    await api.functional.todoList.user.todoListGuests.todoListGuestSessions.create(
      connection,
      {
        todoListGuestId: guest.id,
        body: sessionCreate,
      },
    );
  typia.assert(guestSession);

  // Step 4: Update the Guest Session with new information
  const updatedIp = RandomGenerator.pick([
    "192.168.10.200",
    "10.1.1.11",
    "172.16.50.25",
  ] as const);
  const updatedHref = `https://updated.com/page/${RandomGenerator.alphabets(5)}`;
  const updatedReferrer = `https://updatedreferrer.com/page/${RandomGenerator.alphabets(5)}`;
  const updatedCreatedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const updatedExpiredAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString(); // +1 day

  const sessionUpdate = {
    ip: updatedIp,
    href: updatedHref,
    referrer: updatedReferrer,
    created_at: updatedCreatedAt,
    expired_at: updatedExpiredAt,
  } satisfies ITodoListGuestSession.IUpdate;

  const updatedGuestSession: ITodoListGuestSession =
    await api.functional.todoList.user.todoListGuests.todoListGuestSessions.update(
      connection,
      {
        todoListGuestId: guest.id,
        id: guestSession.id,
        body: sessionUpdate,
      },
    );
  typia.assert(updatedGuestSession);

  // Step 5: Validate that the updated session matches the update request
  TestValidator.equals(
    "Updated IP address should match",
    updatedGuestSession.ip,
    updatedIp,
  );
  TestValidator.equals(
    "Updated href should match",
    updatedGuestSession.href,
    updatedHref,
  );
  TestValidator.equals(
    "Updated referrer should match",
    updatedGuestSession.referrer,
    updatedReferrer,
  );
  TestValidator.equals(
    "Updated created_at should match",
    updatedGuestSession.created_at,
    updatedCreatedAt,
  );
  TestValidator.equals(
    "Updated expired_at should match",
    updatedGuestSession.expired_at,
    updatedExpiredAt,
  );
}
