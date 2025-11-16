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
 * Verify that a platform administrator can retrieve full detail of a specific
 * voting rate limit window for a member user.
 *
 * Business context: Platform admins investigate abuse by inspecting per-user
 * voting rate limit windows. They must be able to see the exact window,
 * counters, and limits for a particular member user and confirm that the record
 * being read is bound to that user.
 *
 * Scenario steps:
 *
 * 1. Join as a new platform administrator using auth.platformAdmin.join. The SDK
 *    will automatically attach the admin JWT into the shared connection.
 * 2. Create one community visibility level and one post type so that the platform
 *    looks realistically configured. These are not functionally required for
 *    the voting rate limit APIs but align with the scenario description.
 * 3. Choose a UUID value to act as the target memberUserId. There is no member
 *    user creation API exposed in this fixture set, so for this E2E test we
 *    rely on the simulator/backend accepting the UUID and returning a coherent
 *    ICommunityPlatformVotingRateLimit linked to a denormalized memberUser
 *    summary.
 * 4. Create a voting rate limit window for that memberUserId through
 *    communityPlatform.platformAdmin.memberUsers.votingRateLimits.create using
 *    a well-formed ICommunityPlatformVotingRateLimit.ICreate body:
 *
 *    - Scope_type: some non-empty string (for example, "global").
 *    - Community_platform_community_id: set to null to model a global scope.
 *    - Window_start/window_end: valid ISO 8601 date-time strings where window_end is
 *         after window_start.
 *    - Allowed_post_votes/allowed_comment_votes: non‑negative int32 values.
 *    - Post_votes_count/comment_votes_count: non‑negative int32 values within those
 *         allowed ceilings.
 *
 *    Capture the returned ICommunityPlatformVotingRateLimit as created.
 * 5. Call the detail endpoint
 *    communityPlatform.platformAdmin.memberUsers.votingRateLimits.at with the
 *    same memberUserId and votingRateLimitId = created.id.
 * 6. Use typia.assert on both create and detail responses to enforce the
 *    ICommunityPlatformVotingRateLimit contract.
 * 7. Use TestValidator.equals to ensure the detail response preserves the key
 *    business fields of the created record:
 *
 *    - Id
 *    - Scope_type
 *    - Window_start
 *    - Window_end
 *    - Post_votes_count
 *    - Comment_votes_count
 *    - Allowed_post_votes
 *    - Allowed_comment_votes
 * 8. Additionally, assert that detail.memberUser.id matches the memberUserId path
 *    parameter used for both create and at calls.
 * 9. For the optional community summary, rely on typia.assert for structural
 *    correctness and only check that its null/non-null state matches between
 *    create and detail responses, since we do not create any explicit community
 *    in this test.
 * 10. We do not exercise negative paths (such as mismatched memberUserId and
 *     votingRateLimitId or non-existent records) because
 *     communityPlatform.platformAdmin.memberUsers.votingRateLimits.at is the
 *     only provided read API and HttpError-based status code checks are outside
 *     the allowed patterns for this suite.
 */
export async function test_api_voting_rate_limit_detail_for_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and let SDK attach JWT
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      ip: undefined,
      href: "https://admin.console.test/join",
      referrer: "https://admin.console.test/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a realistic visibility level
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `vis_${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Create a realistic post type configuration
  const postType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: `post_${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 4. Choose a memberUserId (UUID) to target in this test
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Prepare a coherent window interval and rate limit configuration
  const now = new Date();
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const windowEnd = new Date(now.getTime() + 55 * 60 * 1000); // 55 minutes later

  const allowedPostVotes = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const allowedCommentVotes = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  // Keep consumed counts within allowed ceilings using simple clamping
  const postVotesCount = Math.min(
    allowedPostVotes,
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  ) satisfies number as number;
  const commentVotesCount = Math.min(
    allowedCommentVotes,
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  ) satisfies number as number;

  const createBody = {
    scope_type: "global",
    community_platform_community_id: null,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    allowed_post_votes: allowedPostVotes,
    allowed_comment_votes: allowedCommentVotes,
    post_votes_count: postVotesCount,
    comment_votes_count: commentVotesCount,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  const created: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformVotingRateLimit>(created);

  // 5. Retrieve the same voting rate limit via detail endpoint
  const detail: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.at(
      connection,
      {
        memberUserId,
        votingRateLimitId: created.id,
      },
    );
  typia.assert<ICommunityPlatformVotingRateLimit>(detail);

  // 6. Compare key business fields between created and detail responses
  TestValidator.equals(
    "voting rate limit id should match between create and detail",
    detail.id,
    created.id,
  );
  TestValidator.equals(
    "scope_type should remain consistent",
    detail.scope_type,
    created.scope_type,
  );
  TestValidator.equals(
    "window_start should remain consistent",
    detail.window_start,
    created.window_start,
  );
  TestValidator.equals(
    "window_end should remain consistent",
    detail.window_end,
    created.window_end,
  );
  TestValidator.equals(
    "post_votes_count should remain consistent",
    detail.post_votes_count,
    created.post_votes_count,
  );
  TestValidator.equals(
    "comment_votes_count should remain consistent",
    detail.comment_votes_count,
    created.comment_votes_count,
  );
  TestValidator.equals(
    "allowed_post_votes should remain consistent",
    detail.allowed_post_votes,
    created.allowed_post_votes,
  );
  TestValidator.equals(
    "allowed_comment_votes should remain consistent",
    detail.allowed_comment_votes,
    created.allowed_comment_votes,
  );

  // 7. Validate that the memberUser summary in the detail payload corresponds
  //    to the memberUserId used in the path. In a real backend this enforces
  //    ownership constraints; in simulation we rely on type guarantees.
  TestValidator.equals(
    "memberUser.id in detail should equal path memberUserId",
    detail.memberUser.id,
    memberUserId,
  );

  // 8. Ensure community null/non-null state is the same across create and
  //    detail responses, without enforcing a specific community configuration.
  TestValidator.equals(
    "community presence flag should be consistent",
    detail.community === null || detail.community === undefined
      ? null
      : "present",
    created.community === null || created.community === undefined
      ? null
      : "present",
  );
}
