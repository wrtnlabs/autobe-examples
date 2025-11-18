import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuserSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_session_detail_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(authorized);

  // 2. Create at least one todo as this member user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // Basic sanity check that the created todo is owned by some member user
  TestValidator.predicate(
    "created todo must have an owning member user id",
    createdTodo.memberUser.id.length > 0,
  );

  // 3. Prepare memberUserId and sessionId for session detail request
  const memberUserId = authorized.id;
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call the session detail endpoint as the authenticated member user
  const session: ITodoAppMemberuserSession =
    await api.functional.todoApp.memberUser.memberUsers.sessions.at(
      connection,
      {
        memberUserId,
        sessionId,
      },
    );

  // 5. Validate response structure and key business expectations
  typia.assert<ITodoAppMemberuserSession>(session);

  TestValidator.predicate(
    "session id must be a non-empty string",
    session.id.length > 0,
  );
  TestValidator.predicate(
    "session ip must be a non-empty string",
    session.ip.length > 0,
  );
  TestValidator.predicate(
    "session href must be a non-empty string",
    session.href.length > 0,
  );
  TestValidator.predicate(
    "session referrer must be a non-empty string",
    session.referrer.length > 0,
  );
  TestValidator.predicate(
    "session expired_at is either null or a non-empty string",
    session.expired_at === null || session.expired_at.length > 0,
  );
  TestValidator.predicate(
    "session memberUser summary must have non-empty id",
    session.memberUser.id.length > 0,
  );
  TestValidator.predicate(
    "session memberUser summary must have non-empty email",
    session.memberUser.email.length > 0,
  );
}
