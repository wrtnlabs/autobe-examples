import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingRateLimit";

/**
 * Validate that a platform administrator can create a community-scoped voting
 * rate limit window for a specific member user and then retrieve it via the
 * admin listing endpoint.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a new platform admin and obtain an authenticated context.
 * 2. Create a community visibility level (representative platform configuration).
 * 3. Choose fixture-like member user and community UUIDs.
 * 4. Create a community-scoped voting rate limit window for that member user.
 * 5. Validate the created record's core fields and relationships.
 * 6. List voting rate limits for the member user and confirm the created record
 *    appears with consistent summary data.
 */
export async function test_api_voting_rate_limit_creation_for_member_user_community_scope(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (auth context for privileged APIs)
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Str0ngP@ssw0rd!",
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a community visibility level (platform configuration prerequisite)
  const visibilityCreateBody = {
    code: `vl_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Prepare fixture-like member user and community identifiers
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Define community-scoped voting rate limit window
  const now = new Date();
  const windowStart = now.toISOString();
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const createRateLimitBody = {
    scope_type: "community",
    community_platform_community_id: communityId,
    window_start: windowStart,
    window_end: windowEnd,
    allowed_post_votes: 10,
    allowed_comment_votes: 20,
    post_votes_count: 0,
    comment_votes_count: 0,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  // 5. Create the voting rate limit record
  const createdRateLimit: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: createRateLimitBody,
      },
    );
  typia.assert(createdRateLimit);

  // 6. Validate created record semantics
  TestValidator.equals(
    "created rate limit memberUser.id should match path memberUserId",
    createdRateLimit.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "created rate limit scope_type should be 'community'",
    createdRateLimit.scope_type,
    createRateLimitBody.scope_type,
  );

  // Community summary is optional; if present, ensure it matches communityId
  if (
    createdRateLimit.community !== null &&
    createdRateLimit.community !== undefined
  ) {
    TestValidator.equals(
      "created rate limit community.id should match requested community id",
      createdRateLimit.community.id,
      communityId,
    );
  }

  TestValidator.equals(
    "created rate limit window_start should equal requested window_start",
    createdRateLimit.window_start,
    createRateLimitBody.window_start,
  );
  TestValidator.equals(
    "created rate limit window_end should equal requested window_end",
    createdRateLimit.window_end,
    createRateLimitBody.window_end,
  );

  TestValidator.equals(
    "created rate limit post_votes_count should equal initial count",
    createdRateLimit.post_votes_count,
    createRateLimitBody.post_votes_count,
  );
  TestValidator.equals(
    "created rate limit comment_votes_count should equal initial count",
    createdRateLimit.comment_votes_count,
    createRateLimitBody.comment_votes_count,
  );

  TestValidator.equals(
    "created rate limit allowed_post_votes should equal requested limit",
    createdRateLimit.allowed_post_votes,
    createRateLimitBody.allowed_post_votes,
  );
  TestValidator.equals(
    "created rate limit allowed_comment_votes should equal requested limit",
    createdRateLimit.allowed_comment_votes,
    createRateLimitBody.allowed_comment_votes,
  );

  // 7. Retrieve listing and confirm the created record is present
  const page: IPageICommunityPlatformVotingRateLimit.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      {
        memberUserId,
      },
    );
  typia.assert(page);

  const foundSummary = page.data.find(
    (summary) => summary.id === createdRateLimit.id,
  );

  TestValidator.predicate(
    "listing should contain a summary for the created rate limit record",
    foundSummary !== undefined,
  );

  if (foundSummary !== undefined) {
    typia.assertGuard<ICommunityPlatformVotingRateLimit.ISummary>(foundSummary);

    TestValidator.equals(
      "summary memberUser.id should match memberUserId",
      foundSummary.memberUser.id,
      memberUserId,
    );
    TestValidator.equals(
      "summary scope_type should be 'community'",
      foundSummary.scope_type,
      createRateLimitBody.scope_type,
    );
    TestValidator.equals(
      "summary community_id should equal requested community id",
      foundSummary.community_id,
      communityId,
    );
    TestValidator.equals(
      "summary window_start should equal requested window_start",
      foundSummary.window_start,
      createRateLimitBody.window_start,
    );
    TestValidator.equals(
      "summary window_end should equal requested window_end",
      foundSummary.window_end,
      createRateLimitBody.window_end,
    );
    TestValidator.equals(
      "summary post_votes_count should equal initial count",
      foundSummary.post_votes_count,
      createRateLimitBody.post_votes_count,
    );
    TestValidator.equals(
      "summary comment_votes_count should equal initial count",
      foundSummary.comment_votes_count,
      createRateLimitBody.comment_votes_count,
    );
  }
}
