import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSession";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";

/**
 * List current member user's sessions with default pagination and no filters.
 *
 * Business goal:
 *
 * - After a fresh memberUser registration, ensure that the current actor can
 *   retrieve their own sessions via PATCH
 *   /todoApp/memberUser/actors/current/sessions using default-style pagination
 *   and without applying any filters.
 *
 * Steps:
 *
 * 1. Register a new member user using /auth/memberUser/join.
 * 2. Rely on the SDK to attach the returned access token to the connection, which
 *    implicitly creates at least one session for the member.
 * 3. Call the sessions index endpoint with page=0, limit=20 and no filters.
 * 4. Validate pagination metadata and that at least one session is returned.
 * 5. For all returned sessions, verify they belong to the joined member and that
 *    basic fields are populated as expected.
 */
export async function test_api_todoapp_memberuser_current_sessions_list_default(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const member: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Call sessions listing with default-style pagination and no filters
  const page = 0;
  const limit = 20;

  const requestBody = {
    page,
    limit,
  } satisfies ITodoAppSession.IRequest;

  const pageResult: IPageITodoAppSession.ISummary =
    await api.functional.todoApp.memberUser.actors.current.sessions.index(
      connection,
      {
        body: requestBody,
      },
    );

  typia.assert<IPageITodoAppSession.ISummary>(pageResult);

  const pagination = pageResult.pagination;

  // 3. Pagination validations
  TestValidator.equals(
    "pagination.current equals requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit equals requested limit",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination.records is at least 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination.pages is at least 1",
    pagination.pages >= 1,
  );

  // 4. Data array validations
  TestValidator.predicate(
    "data array has at least one session",
    pageResult.data.length >= 1,
  );

  // 5. Validate that all sessions belong to this member and fields are sane
  for (const session of pageResult.data) {
    typia.assert<ITodoAppSession.ISummary>(session);

    TestValidator.equals(
      "session.actor_type must be member",
      session.actor_type,
      "member",
    );

    TestValidator.equals(
      "session.actor_id must equal member id",
      session.actor_id,
      member.id,
    );

    TestValidator.predicate(
      "session.ip is non-empty string",
      typeof session.ip === "string" && session.ip.length > 0,
    );

    TestValidator.predicate(
      "session.href is non-empty string",
      typeof session.href === "string" && session.href.length > 0,
    );

    TestValidator.predicate(
      "session.referrer is non-empty string",
      typeof session.referrer === "string" && session.referrer.length > 0,
    );
  }
}
