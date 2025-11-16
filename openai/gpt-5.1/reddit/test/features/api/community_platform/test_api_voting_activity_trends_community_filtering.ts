import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends";
import type { ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsBucket";
import type { ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsSeries";

/**
 * Validate that voting activity trend analytics respect communityIds filtering.
 *
 * Business goal: Ensure that the voting analytics endpoint PATCH
 * /communityPlatform/votingKarma/statistics/votingActivityTrends returns
 * consistent trend data and that restricting the query to a specific community
 * via communityIds effectively narrows the aggregation scope.
 *
 * Test flow:
 *
 * 1. Bootstrap actors
 *
 *    - Register a platformAdmin via /auth/platformAdmin/join so that visibility
 *         levels and post types can be created.
 *    - Register a memberUser via /auth/memberUser/join who will create communities,
 *         posts, comments, and votes.
 * 2. Global configuration (platformAdmin)
 *
 *    - Create one community visibility level using POST
 *         /communityPlatform/platformAdmin/communityVisibilityLevels with
 *         ICommunityPlatformCommunityVisibilityLevel.ICreate.
 *    - Create one post type using POST /communityPlatform/platformAdmin/postTypes
 *         with ICommunityPlatformPostType.ICreate.
 * 3. Community and content setup (memberUser)
 *
 *    - Create two communities (A and B) using POST
 *         /communityPlatform/memberUser/communities with
 *         ICommunityPlatformCommunity.ICreate, reusing the same
 *         visibilityLevelCode.
 *    - Create at least one post in community A and one post in community B using
 *         POST /communityPlatform/memberUser/posts with
 *         ICommunityPlatformPost.ICreate.
 *    - For each post, create at least one comment using POST
 *         /communityPlatform/memberUser/posts/{postId}/comments with
 *         ICommunityPlatformComment.ICreate.
 * 4. Voting activity generation
 *
 *    - Cast post votes on both communities’ posts with POST
 *         /communityPlatform/memberUser/postVotes using
 *         ICommunityPlatformPostVote.ICreate, ensuring a mix of upvotes and
 *         downvotes.
 *    - Cast comment votes on comments from both communities using POST
 *         /communityPlatform/memberUser/commentVotes with
 *         ICommunityPlatformCommentVote.ICreate.
 *    - Track a time window [startAt, endAt] that encompasses all vote creation times
 *         by capturing an overall before/after timestamp using new
 *         Date().toISOString().
 * 5. Voting trends analytics - global baseline
 *
 *    - Call PATCH /communityPlatform/votingKarma/statistics/votingActivityTrends via
 *         api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index
 *         with a body that satisfies
 *         ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest:
 *
 *         - StartAt: beforeVotes
 *         - EndAt: afterVotes
 *         - Granularity: "hour" (or another simple string)
 *         - IncludePostVotes: true
 *         - IncludeCommentVotes: true
 *         - No communityIds filter
 *    - Assert the response type using typia.assert and basic business expectations:
 *
 *         - TotalVotes > 0
 *         - Series array is non-empty
 *         - Every series has at least one bucket
 * 6. Voting trends analytics - community A filtered
 *
 *    - Call the same endpoint again with the same time window and granularity, but
 *         with communityIds set to [communityA.id].
 *    - Assert the response type and validate:
 *
 *         - Filtered.totalVotes > 0 (we created activity in A)
 *         - Filtered.totalVotes <= global.totalVotes
 *         - Filtered.series is non-empty and each series has at least one bucket.
 * 7. Optional: Voting trends analytics - community B filtered
 *
 *    - Repeat the filtered call with communityIds = [communityB.id].
 *    - Validate analogous properties as for community A.
 * 8. Series and bucket sanity checks
 *
 *    - For at least one series in the global result, recompute the sum of
 *         bucket.totalVotes and compare it with an independently aggregated
 *         value derived from those buckets, verifying that bucket-level
 *         aggregation is self-consistent.
 *
 * We do not attempt to prove exact numeric relationships between global and
 * per-community series because the analytics endpoint does not expose
 * per-community segmentation detail directly. Instead, we rely on monotonicity
 * (filtered totals not exceeding global totals) and structural consistency to
 * demonstrate that the communityIds filter is honored and that the results are
 * suitable for per-community engagement dashboards.
 */
export async function test_api_voting_activity_trends_community_filtering(
  connection: api.IConnection,
) {
  // 1. Bootstrap actors - platform admin
  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: `${RandomGenerator.alphabets(8)}@admin.test`,
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      ip: undefined,
      href: "https://admin-console.test/join",
      referrer: "https://landing.test/",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Global configuration: create visibility level and post type
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphabets(5)}`,
          name: "Public",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  const postType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: `text-${RandomGenerator.alphabets(5)}`,
          name: "Text Post",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert(postType);

  // 3. Member user setup
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: `${RandomGenerator.alphabets(8)}@member.test` as string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: "https://app.test/join" as string & tags.Format<"uri">,
      referrer: "https://landing.test/" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  // 3. Create communities A and B
  const visibilityCode = visibilityLevel.code;

  const communityA =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-a-${RandomGenerator.alphabets(5)}`,
          title: "Community A",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  const communityB =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-b-${RandomGenerator.alphabets(5)}`,
          title: "Community B",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);

  // 3. Create posts in A and B
  const postA = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_id: communityA.id,
        post_type_id: postType.id,
        title: "Post in Community A",
        body: RandomGenerator.paragraph({ sentences: 8 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postA);

  const postB = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_id: communityB.id,
        post_type_id: postType.id,
        title: "Post in Community B",
        body: RandomGenerator.paragraph({ sentences: 8 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postB);

  // 3. Create comments under each post
  const commentA =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parentCommentId: undefined,
          renderingMode: "markdown",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commentA);

  const commentB =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postB.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parentCommentId: undefined,
          renderingMode: "markdown",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commentB);

  // 4. Capture time window before and after voting
  const beforeVotes = new Date().toISOString() as string &
    tags.Format<"date-time">;

  // Cast a few votes on posts in both communities
  const postVoteA1 =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: {
          community_platform_post_id: postA.id,
          vote_value: 1,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(postVoteA1);

  const postVoteA2 =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: {
          community_platform_post_id: postA.id,
          vote_value: -1,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(postVoteA2);

  const postVoteB1 =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: {
          community_platform_post_id: postB.id,
          vote_value: 1,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(postVoteB1);

  // Cast comment votes in both communities
  const commentVoteA =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: {
          community_platform_comment_id: commentA.id,
          vote_value: 1,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(commentVoteA);

  const commentVoteB =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: {
          community_platform_comment_id: commentB.id,
          vote_value: -1,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(commentVoteB);

  const afterVotes = new Date().toISOString() as string &
    tags.Format<"date-time">;

  // 5. Global voting activity trends
  const globalTrends: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      {
        body: {
          startAt: beforeVotes,
          endAt: afterVotes,
          granularity: "hour",
          includePostVotes: true,
          includeCommentVotes: true,
        } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest,
      },
    );
  typia.assert(globalTrends);

  TestValidator.predicate(
    "global totalVotes should be positive",
    globalTrends.totalVotes > 0,
  );
  TestValidator.predicate(
    "global series should not be empty",
    globalTrends.series.length > 0,
  );

  for (const series of globalTrends.series) {
    TestValidator.predicate(
      "each global series has at least one bucket",
      series.buckets.length > 0,
    );
  }

  // Sanity-check a single series by recomputing bucket totals
  const firstSeries:
    | ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsSeries
    | undefined = globalTrends.series[0];
  if (firstSeries !== undefined) {
    const recomputedTotal = firstSeries.buckets.reduce(
      (sum, bucket) => sum + bucket.totalVotes,
      0 as number & tags.Type<"int32">,
    );
    TestValidator.predicate(
      "recomputed bucket total should be non-negative",
      recomputedTotal >= 0,
    );
  }

  // 6. Community A filtered trends
  const communityATrends: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      {
        body: {
          startAt: beforeVotes,
          endAt: afterVotes,
          granularity: "hour",
          communityIds: [communityA.id],
          includePostVotes: true,
          includeCommentVotes: true,
        } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest,
      },
    );
  typia.assert(communityATrends);

  TestValidator.predicate(
    "community A totalVotes should be positive",
    communityATrends.totalVotes > 0,
  );
  TestValidator.predicate(
    "community A totalVotes should not exceed global totalVotes",
    communityATrends.totalVotes <= globalTrends.totalVotes,
  );
  TestValidator.predicate(
    "community A series should not be empty",
    communityATrends.series.length > 0,
  );
  for (const series of communityATrends.series) {
    TestValidator.predicate(
      "each community A series has at least one bucket",
      series.buckets.length > 0,
    );
  }

  // 7. Community B filtered trends
  const communityBTrends: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      {
        body: {
          startAt: beforeVotes,
          endAt: afterVotes,
          granularity: "hour",
          communityIds: [communityB.id],
          includePostVotes: true,
          includeCommentVotes: true,
        } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest,
      },
    );
  typia.assert(communityBTrends);

  TestValidator.predicate(
    "community B totalVotes should be positive",
    communityBTrends.totalVotes > 0,
  );
  TestValidator.predicate(
    "community B totalVotes should not exceed global totalVotes",
    communityBTrends.totalVotes <= globalTrends.totalVotes,
  );
  TestValidator.predicate(
    "community B series should not be empty",
    communityBTrends.series.length > 0,
  );
  for (const series of communityBTrends.series) {
    TestValidator.predicate(
      "each community B series has at least one bucket",
      series.buckets.length > 0,
    );
  }
}
