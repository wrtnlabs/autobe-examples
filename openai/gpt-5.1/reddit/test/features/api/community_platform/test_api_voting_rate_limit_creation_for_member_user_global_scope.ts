import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingRateLimit";

export async function test_api_voting_rate_limit_creation_for_member_user_global_scope(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join) to obtain authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Prepare member user id (placeholder UUID) and global voting rate limit payload
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const baseDate: Date = RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24);
  const windowStartDate: Date = baseDate;
  const windowEndDate: Date = new Date(baseDate.getTime() + 1000 * 60 * 60); // +1 hour

  const window_start: string & tags.Format<"date-time"> =
    windowStartDate.toISOString() as string & tags.Format<"date-time">;
  const window_end: string & tags.Format<"date-time"> =
    windowEndDate.toISOString() as string & tags.Format<"date-time">;

  const allowed_post_votes = 10;
  const allowed_comment_votes = 20;

  const createBody = {
    scope_type: "global",
    community_platform_community_id: null,
    window_start,
    window_end,
    allowed_post_votes,
    allowed_comment_votes,
    post_votes_count: 0,
    comment_votes_count: 0,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  // 3. Call create endpoint to create a global voting rate limit window
  const created: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformVotingRateLimit>(created);

  // 4. Validate core fields of the created rate limit
  TestValidator.equals(
    "created rate limit scope_type matches input",
    created.scope_type,
    createBody.scope_type,
  );

  TestValidator.equals(
    "created rate limit window_start matches input",
    created.window_start,
    createBody.window_start,
  );

  TestValidator.equals(
    "created rate limit window_end matches input",
    created.window_end,
    createBody.window_end,
  );

  TestValidator.equals(
    "created rate limit allowed_post_votes matches input",
    created.allowed_post_votes,
    createBody.allowed_post_votes,
  );

  TestValidator.equals(
    "created rate limit allowed_comment_votes matches input",
    created.allowed_comment_votes,
    createBody.allowed_comment_votes,
  );

  TestValidator.equals(
    "created rate limit post_votes_count is initialized to 0",
    created.post_votes_count,
    createBody.post_votes_count,
  );

  TestValidator.equals(
    "created rate limit comment_votes_count is initialized to 0",
    created.comment_votes_count,
    createBody.comment_votes_count,
  );

  TestValidator.equals(
    "created rate limit memberUser id matches path memberUserId",
    created.memberUser.id,
    memberUserId,
  );

  // Global scope: community should be null or undefined
  TestValidator.predicate(
    "created rate limit community is null or undefined for global scope",
    created.community === null || created.community === undefined,
  );

  // Non-negative counters
  TestValidator.predicate(
    "created rate limit post_votes_count is non-negative",
    created.post_votes_count >= 0,
  );

  TestValidator.predicate(
    "created rate limit comment_votes_count is non-negative",
    created.comment_votes_count >= 0,
  );

  TestValidator.predicate(
    "created rate limit allowed_post_votes is non-negative",
    created.allowed_post_votes >= 0,
  );

  TestValidator.predicate(
    "created rate limit allowed_comment_votes is non-negative",
    created.allowed_comment_votes >= 0,
  );

  // Audit timestamps and forward-moving window
  const createdWindowStartMs = new Date(created.window_start).getTime();
  const createdWindowEndMs = new Date(created.window_end).getTime();
  TestValidator.predicate(
    "created rate limit window_start is before window_end",
    createdWindowStartMs < createdWindowEndMs,
  );

  const createdAtMs = new Date(created.created_at).getTime();
  const updatedAtMs = new Date(created.updated_at).getTime();
  TestValidator.predicate(
    "created rate limit updated_at is not before created_at",
    createdAtMs <= updatedAtMs,
  );

  // 5. Fetch paginated list for the same member user and validate persistence
  const page: IPageICommunityPlatformVotingRateLimit.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      {
        memberUserId,
      },
    );
  typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>(page);

  TestValidator.predicate(
    "voting rate limits page has at least one record",
    page.data.length >= 1 && page.pagination.records >= 0,
  );

  const foundSummary = page.data.find((item) => item.id === created.id);

  TestValidator.predicate(
    "created rate limit appears in index listing",
    foundSummary !== undefined,
  );

  if (foundSummary !== undefined) {
    typia.assertGuard<ICommunityPlatformVotingRateLimit.ISummary>(foundSummary);

    TestValidator.equals(
      "summary scope_type matches created record",
      foundSummary.scope_type,
      created.scope_type,
    );

    TestValidator.equals(
      "summary memberUser id matches path memberUserId",
      foundSummary.memberUser.id,
      memberUserId,
    );

    TestValidator.equals(
      "summary window_start matches created record",
      foundSummary.window_start,
      created.window_start,
    );

    TestValidator.equals(
      "summary window_end matches created record",
      foundSummary.window_end,
      created.window_end,
    );

    TestValidator.equals(
      "summary post_votes_count matches created record",
      foundSummary.post_votes_count,
      created.post_votes_count,
    );

    TestValidator.equals(
      "summary comment_votes_count matches created record",
      foundSummary.comment_votes_count,
      created.comment_votes_count,
    );

    // Global scope: community_id should be null
    TestValidator.equals(
      "summary community_id is null for global scope",
      foundSummary.community_id,
      null,
    );

    TestValidator.equals(
      "summary created_at matches created record",
      foundSummary.created_at,
      created.created_at,
    );

    TestValidator.equals(
      "summary updated_at matches created record",
      foundSummary.updated_at,
      created.updated_at,
    );
  }
}
