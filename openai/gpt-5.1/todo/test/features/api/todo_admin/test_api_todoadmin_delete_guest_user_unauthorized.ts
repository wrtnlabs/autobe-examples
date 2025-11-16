import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";

export async function test_api_todoadmin_delete_guest_user_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register a normal todoUser and obtain a non-admin Authorization context.
  const todoUserJoinBody = typia.random<ITodoAppTodoUserJoin.IRequest>();

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserJoinBody,
    });
  typia.assert(todoUserAuthorized);

  // At this point, `connection.headers.Authorization` has been set to a
  // todoUser access token by the SDK join() implementation.

  // 2. As a todoUser (non-admin), attempt to delete a guest user.
  //    This must fail because the endpoint is todoAdmin-protected.
  const unauthorizedGuestUserId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "todoUser must not be able to delete guest users",
    async () => {
      await api.functional.todoApp.todoAdmin.guestUsers.erase(connection, {
        guestUserId: unauthorizedGuestUserId,
      });
    },
  );

  // 3. Build an anonymous connection (no Authorization header).
  //    Never mutate connection.headers directly; clone the connection and
  //    provide an empty headers object for an unauthenticated context.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. As an anonymous caller, attempt to delete a guest user.
  //    This must also fail because authentication is missing.
  const anonymousGuestUserId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "anonymous caller must not be able to delete guest users",
    async () => {
      await api.functional.todoApp.todoAdmin.guestUsers.erase(
        anonymousConnection,
        {
          guestUserId: anonymousGuestUserId,
        },
      );
    },
  );
}
