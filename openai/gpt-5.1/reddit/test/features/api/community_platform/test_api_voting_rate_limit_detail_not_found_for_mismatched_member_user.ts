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

/**
 * Ensure voting rate limit detail lookup enforces member user ownership.
 *
 * This test verifies that the platform-admin voting rate limit detail endpoint
 * does not return a record when the `memberUserId` path parameter does not
 * match the owner of the requested `votingRateLimitId`.
 *
 * Business rationale: Voting rate limit windows are per-member-user safety
 * controls. Even privileged platform administrators must not be able to fetch a
 * rate limit record by arbitrary ID without also specifying a consistent owning
 * member user, otherwise cross-user leakage of safety telemetry and
 * abuse-related configuration could occur through mis-specified paths.
 *
 * Test flow:
 *
 * 1. Join as a new platform admin to obtain an authenticated connection.
 * 2. Create a community visibility level to simulate realistic configuration.
 * 3. Create a post type to further align with platform configuration.
 * 4. Create a voting rate limit record for a first member user (memberUserA) using
 *    `memberUsers.votingRateLimits.create` and capture its ID and the owner
 *    `memberUser.id`.
 * 5. Generate a distinct second member user ID (memberUserB) that is guaranteed to
 *    differ from the first owner.
 * 6. Call the detail endpoint `memberUsers.votingRateLimits.at` with the
 *    mismatched pair: `memberUserIdB` plus the `votingRateLimitId` created for
 *    memberUserA.
 * 7. Assert that this mismatched call fails (throws), satisfying the not-found
 *    semantics for cross-user lookup.
 */
export async function test_api_voting_rate_limit_detail_not_found_for_mismatched_member_user(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a community visibility level
  const visibilityBody = {
    code: `public-${RandomGenerator.alphabets(6)}`,
    name: "Public visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibility);

  // 3. Create a post type
  const postTypeBody = {
    code: `text-${RandomGenerator.alphabets(6)}`,
    name: "Text post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeBody,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 4. Create a voting rate limit window for memberUserA
  const memberUserIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const now = new Date();
  const windowStart = now.toISOString();
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const rateLimitCreateBody = {
    scope_type: "global",
    community_platform_community_id: null,
    window_start: windowStart,
    window_end: windowEnd,
    allowed_post_votes: 100,
    allowed_comment_votes: 200,
    post_votes_count: 0,
    comment_votes_count: 0,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  const createdLimitA: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId: memberUserIdA,
        body: rateLimitCreateBody,
      },
    );
  typia.assert<ICommunityPlatformVotingRateLimit>(createdLimitA);

  // Ensure the created record is logically tied to the memberUserIdA
  TestValidator.equals(
    "created voting rate limit belongs to memberUserIdA",
    createdLimitA.memberUser.id,
    memberUserIdA,
  );

  const votingRateLimitIdA: string & tags.Format<"uuid"> = createdLimitA.id;

  // 5. Generate a distinct memberUserB id
  let memberUserIdB: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (memberUserIdB === createdLimitA.memberUser.id) {
    memberUserIdB = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "second member user id must differ from first",
    memberUserIdB,
    createdLimitA.memberUser.id,
  );

  // 6 & 7. Attempt to fetch the voting rate limit using mismatched memberUserIdB
  // and assert that this results in an error (not found semantics).
  await TestValidator.error(
    "mismatched member user should not retrieve voting rate limit",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
        connection,
        {
          memberUserId: memberUserIdB,
          votingRateLimitId: votingRateLimitIdA,
        },
      );
    },
  );
}
