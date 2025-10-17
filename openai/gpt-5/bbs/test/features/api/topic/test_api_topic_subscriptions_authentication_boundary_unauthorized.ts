import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";

/**
 * Authentication boundary for member topic subscriptions listing.
 *
 * Verifies that GET /econDiscuss/member/me/topics rejects unauthenticated
 * requests and succeeds after obtaining a valid member session via join.
 *
 * Steps
 *
 * 1. Use an unauthenticated connection to call the endpoint and expect an error
 *    (no status-code assertions).
 * 2. Register a member with POST /auth/member/join to obtain tokens (SDK
 *    auto-injects Authorization header into the connection).
 * 3. Call the endpoint again with the authenticated connection and validate the
 *    paginated response shape.
 */
export async function test_api_topic_subscriptions_authentication_boundary_unauthorized(
  connection: api.IConnection,
) {
  // 1) Unauthenticated negative test — clone to a fresh connection without headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated member topic subscriptions must fail",
    async () => {
      await api.functional.econDiscuss.member.me.topics.index(unauthConn);
    },
  );

  // 2) Register a member to authenticate the main connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<120>
    >(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 3) Authenticated positive test — expect successful page response
  const page =
    await api.functional.econDiscuss.member.me.topics.index(connection);
  typia.assert<IPageIEconDiscussTopic.ISummary>(page);
}
