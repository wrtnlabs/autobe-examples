import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorSession";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

export async function test_api_todo_admin_actor_session_detail_forbidden_without_auth(
  connection: api.IConnection,
) {
  // 1. Arrange: register a new todoAdmin to ensure the system has
  //    at least one valid administrative account and a corresponding
  //    session. This also verifies that the join endpoint works and
  //    demonstrates the normal authenticated setup flow, even though
  //    the core of this test is about *unauthenticated* access.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const authorizedAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorizedAdmin);

  // 2. Build an unauthenticated connection by cloning the existing
  //    connection but providing an empty headers object. Per
  //    guidelines, we must not touch headers after construction.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Prepare a syntactically valid sessionId. The actual existence
  //    of the session record is not critical for this authorization
  //    test; the important part is that the request targets the
  //    administrative session-detail endpoint without auth.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Act & Assert: calling the actor session detail endpoint without
  //    any Authorization header must fail. We do not assert on a
  //    specific HTTP status code; instead, we only require that some
  //    error is thrown, ensuring that unauthenticated callers cannot
  //    obtain ITodoAppActorSession data.
  await TestValidator.error(
    "unauthenticated access to todoAdmin actor session detail must fail",
    async () => {
      await api.functional.todoApp.todoAdmin.actors.sessions.at(
        unauthenticated,
        { sessionId },
      );
    },
  );
}
