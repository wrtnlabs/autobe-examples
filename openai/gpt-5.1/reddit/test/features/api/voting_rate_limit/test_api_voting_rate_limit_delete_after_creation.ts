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
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";

export async function test_api_voting_rate_limit_delete_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish authenticated context
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a community visibility level as part of realistic admin setup
  const visibilityCreateBody = {
    code: `vis_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type under the same admin context
  const postTypeCreateBody = {
    code: `post_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Choose a memberUserId from test fixtures (here: random UUID)
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Create a voting rate limit window for that member user
  const now = new Date();
  const windowStart = new Date(now.getTime()).toISOString();
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const votingRateLimitCreateBody = {
    scope_type: "global",
    community_platform_community_id: null,
    window_start: windowStart,
    window_end: windowEnd,
    allowed_post_votes: 100,
    allowed_comment_votes: 200,
    post_votes_count: 0,
    comment_votes_count: 0,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  const createdRateLimit: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: votingRateLimitCreateBody,
      },
    );
  typia.assert(createdRateLimit);

  // Basic sanity checks on created rate limit
  TestValidator.equals(
    "created rate limit id must be a non-empty UUID",
    createdRateLimit.id,
    createdRateLimit.id,
  );

  TestValidator.equals(
    "created rate limit window_start must match request",
    createdRateLimit.window_start,
    windowStart,
  );

  TestValidator.equals(
    "created rate limit window_end must match request",
    createdRateLimit.window_end,
    windowEnd,
  );

  TestValidator.equals(
    "created rate limit allowed_post_votes must match request",
    createdRateLimit.allowed_post_votes,
    votingRateLimitCreateBody.allowed_post_votes,
  );

  TestValidator.equals(
    "created rate limit allowed_comment_votes must match request",
    createdRateLimit.allowed_comment_votes,
    votingRateLimitCreateBody.allowed_comment_votes,
  );

  // 6. Retrieve the created voting rate limit to confirm existence before deletion
  const fetchedBeforeDelete: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
      connection,
      {
        memberUserId,
        votingRateLimitId: createdRateLimit.id,
      },
    );
  typia.assert(fetchedBeforeDelete);

  TestValidator.equals(
    "fetched rate limit id must equal created id",
    fetchedBeforeDelete.id,
    createdRateLimit.id,
  );

  // 7. Delete the rate limit window
  await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.erase(
    connection,
    {
      memberUserId,
      votingRateLimitId: createdRateLimit.id,
    },
  );

  // 8. Verify that subsequent GET fails, meaning the record no longer exists
  await TestValidator.error(
    "fetching deleted voting rate limit should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
        connection,
        {
          memberUserId,
          votingRateLimitId: createdRateLimit.id,
        },
      );
    },
  );
}
