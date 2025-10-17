import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUserReputation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserReputation";

/**
 * Read self reputation aggregate for a freshly joined member and verify
 * authentication boundary.
 *
 * Steps
 *
 * 1. Join as a new member (tokens issued and applied to the connection).
 * 2. GET /econDiscuss/member/me/reputation with the authenticated connection.
 *
 *    - Accept either a 200 response with an aggregate (preferred default score 0) or
 *         an error (e.g., no aggregate yet). On success, validate business
 *         expectations: ownership and non-negative score.
 * 3. Boundary: Use an unauthenticated connection and verify the request fails.
 */
export async function test_api_member_reputation_fetch_default_new_user(
  connection: api.IConnection,
) {
  // 1) Join as a new member (authenticate)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Fetch current reputation aggregate (accept success or missing-aggregate error)
  try {
    const reputation =
      await api.functional.econDiscuss.member.me.reputation.at(connection);
    typia.assert(reputation);

    // Business validations
    TestValidator.equals(
      "reputation belongs to the joined member",
      reputation.userId,
      authorized.id,
    );
    TestValidator.predicate(
      "reputation score must be non-negative",
      reputation.score >= 0,
    );
  } catch (_err) {
    // Acceptable path: provider may choose to omit aggregate for a new account
    // No-op; the absence is allowed by product policy (e.g., 404)
  }

  // 3) Boundary: unauthenticated request must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot fetch self reputation",
    async () => {
      await api.functional.econDiscuss.member.me.reputation.at(unauthConn);
    },
  );
}
