import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestSession";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

/**
 * End to end test function to validate deletion of a guest session by a
 * registered user.
 *
 * This test performs user join to authenticate, then creates a guest, creates a
 * guest session, and deletes the session via the API. It finally attempts to
 * delete the same session to verify removal.
 */
export async function test_api_todo_list_guest_session_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new user
  const userBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;
  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a guest user
  const guestBody = {
    visitor_ip: "192.168." + RandomGenerator.alphaNumeric(3),
  } satisfies ITodoListGuest.ICreate;
  const guest: ITodoListGuest =
    await api.functional.todoList.todoListGuests.create(connection, {
      body: guestBody,
    });
  typia.assert(guest);

  // 3. Create a guest session
  const nowIsoString: string = new Date().toISOString();
  const sessionBody = {
    ip: guest.visitor_ip,
    href: "https://example.com/dashboard",
    referrer: "https://google.com",
    created_at: nowIsoString,
    expired_at: null,
  } satisfies ITodoListGuestSession.ICreate;

  const session: ITodoListGuestSession =
    await api.functional.todoList.user.todoListGuests.todoListGuestSessions.create(
      connection,
      {
        todoListGuestId: guest.id,
        body: sessionBody,
      },
    );
  typia.assert(session);

  // 4. Delete the guest session
  await api.functional.todoList.user.todoListGuests.todoListGuestSessions.erase(
    connection,
    {
      todoListGuestId: guest.id,
      id: session.id,
    },
  );

  // 5. Verify deletion by expecting error on repeated delete
  await TestValidator.error(
    "Deleting non-existent session should fail",
    async () => {
      await api.functional.todoList.user.todoListGuests.todoListGuestSessions.erase(
        connection,
        {
          todoListGuestId: guest.id,
          id: session.id,
        },
      );
    },
  );
}
