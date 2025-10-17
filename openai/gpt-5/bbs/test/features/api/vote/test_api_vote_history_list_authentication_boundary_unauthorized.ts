import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteStatus";
import type { IEEconDiscussPostVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteType";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostVote";

export async function test_api_vote_history_list_authentication_boundary_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Authentication boundary for member vote history listing.
   *
   * Business goal:
   *
   * - Ensure unauthenticated requests to GET /econDiscuss/member/me/votes are
   *   rejected.
   * - Ensure the same endpoint succeeds after registering (joining) a member and
   *   receiving an access token.
   *
   * Steps:
   *
   * 1. Call the votes listing endpoint without Authorization header and expect an
   *    error.
   * 2. Join as a member via /auth/member/join.
   * 3. Call the votes listing endpoint again with the now-authenticated connection
   *    and validate the paginated response structure.
   */

  // 1) Unauthenticated request must be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated member vote history must be rejected",
    async () => {
      await api.functional.econDiscuss.member.me.votes.index(unauthConn);
    },
  );

  // 2) Register (join) a new member to obtain an authenticated session
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12), // >= 8 chars
      display_name: RandomGenerator.name(),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 3) Authenticated request should succeed and return a typed page result
  const page =
    await api.functional.econDiscuss.member.me.votes.index(connection);
  typia.assert(page);
}
