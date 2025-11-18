import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuserSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate retrieval of member user session details and ownership context.
 *
 * Business intent (adapted):
 *
 * - Ensure that, after registering as a member user and performing activity
 *   (creating a todo), we can call the session detail endpoint and receive a
 *   structurally valid session representation.
 * - Confirm that todo ownership is wired to the authenticated member user.
 * - Exercise the session detail API surface, validating its DTO structure and the
 *   presence of audit-related metadata (ip, href, referrer, created_at).
 *
 * Due to missing API to force or query specific expired sessions, we do not
 * assert that the retrieved session is actually expired, but we still validate
 * the general shape and non-emptiness of key fields.
 */
export async function test_api_member_session_detail_for_expired_session(
  connection: api.IConnection,
) {
  // 1) Register a new member user (join) to establish an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Create a todo as this member user to ensure ownership wiring and activity
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todo);

  // Confirm that the todo is owned by the same member user we just joined as
  TestValidator.equals(
    "todo.owner.id should equal authorized member user id",
    todo.memberUser.id,
    authorized.id,
  );

  // 3) Retrieve a member user session detail
  // Note: We do not have an API to list sessions or to reference the exact
  // current session id. For the purpose of this E2E, we call the endpoint with
  // the authorized memberUserId and a random sessionId, and focus on structural
  // validation of the response DTO.
  const session: ITodoAppMemberuserSession =
    await api.functional.todoApp.memberUser.memberUsers.sessions.at(
      connection,
      {
        memberUserId: authorized.id,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(session);

  // Basic sanity checks on returned session metadata
  TestValidator.predicate(
    "session id is a non-empty string",
    session.id.length > 0,
  );
  TestValidator.predicate(
    "session ip is a non-empty string",
    session.ip.length > 0,
  );
  TestValidator.predicate(
    "session href is a non-empty string",
    session.href.length > 0,
  );
  TestValidator.predicate(
    "session referrer is a non-empty string",
    session.referrer.length > 0,
  );
  TestValidator.predicate(
    "session created_at is a non-empty string",
    session.created_at.length > 0,
  );

  // We cannot reliably assert expiration semantics (expired_at non-null and
  // created_at < expired_at) without a way to obtain a definitely expired
  // session for this user, so we intentionally omit those checks to keep this
  // test implementable and compilation-safe.
}
