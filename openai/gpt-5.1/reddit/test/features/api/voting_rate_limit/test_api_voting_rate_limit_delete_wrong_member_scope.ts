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

/**
 * Validate that deleting a member user's voting rate limit is scoped to that
 * member only and does not affect other members' rate limit windows.
 *
 * Business goal: A platform administrator can manage per-member voting rate
 * limits. When they delete a specific voting rate limit record for one member,
 * only that exact record must be removed. Other members' rate limits must
 * remain intact. Also, any subsequent read of the deleted record should fail
 * with a not-found style error.
 *
 * Steps:
 *
 * 1. Join as a platform admin to obtain an authenticated admin context.
 * 2. Prepare two distinct member user IDs (treated as external fixtures since
 *    member user creation is out of scope for this test).
 * 3. For memberUserIdA, create a voting rate limit window and capture it.
 * 4. For memberUserIdB, create another voting rate limit window and capture it.
 * 5. Delete the voting rate limit for memberUserIdA.
 * 6. Confirm that reading the deleted record for memberUserIdA fails.
 * 7. Confirm that reading memberUserIdB's record still succeeds.
 */
export async function test_api_voting_rate_limit_delete_wrong_member_scope(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare two distinct member user IDs (fixture UUIDs).
  const memberUserIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const memberUserIdB: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Helper function to build a valid ICommunityPlatformVotingRateLimit.ICreate body.
  const buildCreateBody = (): ICommunityPlatformVotingRateLimit.ICreate => {
    const now = new Date();
    const oneHourMs = 60 * 60 * 1000;
    const windowStart = now.toISOString();
    const windowEnd = new Date(now.getTime() + oneHourMs).toISOString();

    // Allowed counts and initial counters must be non-negative int32.
    const allowedPostVotes = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >();
    const allowedCommentVotes = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >();

    const postVotesCount = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >();
    const commentVotesCount = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >();

    return {
      scope_type: RandomGenerator.pick(["global", "community"] as const),
      community_platform_community_id: null,
      window_start: windowStart,
      window_end: windowEnd,
      allowed_post_votes: allowedPostVotes,
      allowed_comment_votes: allowedCommentVotes,
      post_votes_count: postVotesCount,
      comment_votes_count: commentVotesCount,
    } satisfies ICommunityPlatformVotingRateLimit.ICreate;
  };

  // 3. Create a voting rate limit for memberUserIdA.
  const createBodyA = buildCreateBody();
  const rateLimitA: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId: memberUserIdA,
        body: createBodyA,
      },
    );
  typia.assert(rateLimitA);

  // 4. Create a voting rate limit for memberUserIdB.
  const createBodyB = buildCreateBody();
  const rateLimitB: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId: memberUserIdB,
        body: createBodyB,
      },
    );
  typia.assert(rateLimitB);

  // Sanity checks: created records are associated with different member users.
  TestValidator.notEquals(
    "voting rate limit IDs for A and B must differ",
    rateLimitA.id,
    rateLimitB.id,
  );
  TestValidator.notEquals(
    "member user IDs A and B must differ",
    memberUserIdA,
    memberUserIdB,
  );

  // 5. Delete the voting rate limit for memberUserIdA.
  await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.erase(
    connection,
    {
      memberUserId: memberUserIdA,
      votingRateLimitId: rateLimitA.id,
    },
  );

  // 6. Confirm that reading the deleted record for memberUserIdA now fails.
  await TestValidator.error(
    "deleted voting rate limit for memberUserIdA must not be retrievable",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
        connection,
        {
          memberUserId: memberUserIdA,
          votingRateLimitId: rateLimitA.id,
        },
      );
    },
  );

  // 7. Confirm that memberUserIdB's voting rate limit is still retrievable.
  const stillExistingForB: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
      connection,
      {
        memberUserId: memberUserIdB,
        votingRateLimitId: rateLimitB.id,
      },
    );
  typia.assert(stillExistingForB);

  TestValidator.equals(
    "rate limit for memberUserIdB remains accessible after deleting A's record",
    stillExistingForB.id,
    rateLimitB.id,
  );
}
