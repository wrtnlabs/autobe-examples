import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorSession";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

export async function test_api_todo_admin_actor_session_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain authorized context and tokens.
  //    join() will also set connection.headers.Authorization automatically.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // Use plausible URLs for href and referrer.
    href: "https://console.todoapp.example.com/admin/join",
    referrer: "https://console.todoapp.example.com/landing",
    // Optional ip; can be null or omitted. Here we send a realistic IPv4.
    ip: "203.0.113.10",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // Sanity: token must look non-empty; rely on type-level structure plus
  // a basic business-level predicate.
  TestValidator.predicate(
    "admin token access must be non-empty",
    () => admin.token.access.length > 0,
  );

  // 2. Generate a sessionId to query.
  //    In real systems this would come from a session search/list endpoint or
  //    from decoded token context, but such APIs are not provided here. We
  //    therefore use a random UUID consistent with the mock test pattern and
  //    rely on the backend or simulator to provide a corresponding session
  //    record.
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the admin-only session detail endpoint.
  const session: ITodoAppActorSession =
    await api.functional.todoApp.todoAdmin.actors.sessions.at(connection, {
      sessionId,
    });
  typia.assert<ITodoAppActorSession>(session);

  // 4. Business-level validations on the returned session.
  // 4-1. The session id in the payload should match the id we requested.
  TestValidator.equals(
    "session.id must match requested sessionId",
    session.id,
    sessionId,
  );

  // 4-2. actorType should be one of the logical categories described by
  //      ITodoAppActorSession documentation.
  const allowedActorTypes = ["admin", "user", "guest"] as const;
  TestValidator.predicate("actorType must be one of admin|user|guest", () =>
    (allowedActorTypes as readonly string[]).includes(session.actorType),
  );

  // 4-3. actorId is a non-empty UUID-shaped string (format is already
  //      validated by typia; here we only require non-empty for business
  //      semantics).
  TestValidator.predicate(
    "actorId must be non-empty string",
    () => session.actorId.length > 0,
  );

  // 4-4. Core metadata fields must be non-empty strings.
  TestValidator.predicate("ip must be non-empty", () => session.ip.length > 0);
  TestValidator.predicate(
    "href must be non-empty",
    () => session.href.length > 0,
  );
  TestValidator.predicate(
    "referrer must be non-empty",
    () => session.referrer.length > 0,
  );
  TestValidator.predicate(
    "createdAt must be non-empty",
    () => session.createdAt.length > 0,
  );

  // 5. Read-only semantics: calling the endpoint twice for the same id should
  //    not change the data, so the second response should equal the first.
  const sessionAgain: ITodoAppActorSession =
    await api.functional.todoApp.todoAdmin.actors.sessions.at(connection, {
      sessionId,
    });
  typia.assert<ITodoAppActorSession>(sessionAgain);

  TestValidator.equals(
    "re-fetching the same session must return identical data (read-only)",
    sessionAgain,
    session,
  );
}
