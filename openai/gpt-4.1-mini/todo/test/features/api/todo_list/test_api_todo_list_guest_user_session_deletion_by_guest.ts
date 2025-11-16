import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListGuest";

export async function test_api_todo_list_guest_user_session_deletion_by_guest(
  connection: api.IConnection,
) {
  // 1. Guest user registration (join) to get authentication tokens
  const guestCreateBody = {
    nickname: RandomGenerator.name(),
    client_version: "1.0.0",
    href: `https://${RandomGenerator.name(2).replace(/ /g, "").toLowerCase()}.com`,
    referrer: `https://${RandomGenerator.name(2).replace(/ /g, "").toLowerCase()}.com/referrer`,
  } satisfies ITodoListTodoListGuest.ICreate;

  const guestAuthorized: ITodoListTodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestCreateBody });
  typia.assert(guestAuthorized);

  // 2. Using the authorized guest user session id from the join response
  const sessionId: string & tags.Format<"uuid"> = guestAuthorized.id;

  // 3. Delete the guest user session by sessionId
  await api.functional.todoList.guest.todoListUserSessions.erase(connection, {
    id: sessionId,
  });
}
