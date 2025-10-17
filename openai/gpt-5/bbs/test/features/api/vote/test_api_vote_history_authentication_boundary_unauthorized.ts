import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteStatus";
import type { IEEconDiscussPostVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteType";
import type { IEEconDiscussVoteSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteSortBy";
import type { IEEconDiscussVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteStatus";
import type { IEEconDiscussVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteType";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostVote";

/**
 * Authentication boundary: econDiscuss member vote history requires a valid
 * session.
 *
 * This test validates that accessing the protected endpoint PATCH
 * /econDiscuss/member/me/votes fails without authentication and succeeds after
 * acquiring a valid member session via join. It does not assert specific HTTP
 * status codes; instead, it verifies error occurrence on unauthenticated access
 * and successful typed response when authenticated. It also checks basic
 * pagination behavior (limit equals requested pageSize and result size does not
 * exceed pageSize).
 *
 * Steps
 *
 * 1. Build an unauthenticated connection and call votes.search → expect error (no
 *    status check)
 * 2. Join as a member to obtain a token (SDK attaches Authorization automatically)
 * 3. Call votes.search again with the same request body → expect success
 * 4. Validate pagination semantics and rely on typia.assert for schema/type checks
 *    (including ISO timestamps)
 */
export async function test_api_vote_history_authentication_boundary_unauthorized(
  connection: api.IConnection,
) {
  // Search request body with explicit pagination and sorting.
  const searchBody = {
    page: 1,
    pageSize: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  } satisfies IEconDiscussPostVote.IRequest;

  // 1) Unauthenticated access must fail (do not assert specific HTTP codes)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated vote history access should be rejected",
    async () => {
      await api.functional.econDiscuss.member.me.votes.search(unauthConn, {
        body: searchBody,
      });
    },
  );

  // 2) Join as a member to obtain a valid session token (SDK manages headers)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 3) Authenticated access should succeed and return a typed paginated list
  const pageResult = await api.functional.econDiscuss.member.me.votes.search(
    connection,
    { body: searchBody },
  );
  typia.assert(pageResult);

  // 4) Business validations beyond type checking
  TestValidator.equals(
    "pagination.limit equals requested pageSize",
    pageResult.pagination.limit,
    searchBody.pageSize,
  );
  TestValidator.predicate(
    "result size does not exceed requested pageSize",
    pageResult.data.length <= (searchBody.pageSize ?? 0),
  );
}
