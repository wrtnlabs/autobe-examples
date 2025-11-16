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
 * Validate basic voting activity trends time-series over a recent 7-day window.
 *
 * Business goal: ensure dashboard consumers can rely on
 * /communityPlatform/votingKarma/statistics/votingActivityTrends to produce a
 * coherent daily time-series that reflects aggregated post and comment votes
 * over a defined time range, without requiring explicit authentication.
 *
 * High-level flow:
 *
 * 1. Seed configuration data as platformAdmin:
 *
 *    - Create a community visibility level.
 *    - Create a post type.
 * 2. Seed content and votes as memberUser:
 *
 *    - Join as a member user.
 *    - Create a community using the created visibility level code.
 *    - Create a post in that community using the created post type id.
 *    - Create a comment under the post.
 *    - Cast at least one post vote and one comment vote.
 * 3. Build a 7-day [startAt, endAt) window ending at now with granularity "day",
 *    includePostVotes=true and includeCommentVotes=true.
 * 4. Call votingActivityTrends.index and validate:
 *
 *    - Series is non-empty.
 *    - TotalVotes equals the sum of bucket.totalVotes across all series.
 *    - Buckets within each series are sorted by startAt ascending and do not go
 *         backwards in time.
 *    - For every bucket, totalVotes == upVotes + downVotes.
 *    - For every bucket, 0 <= upvoteRatio <= 1 and it approximately equals upVotes /
 *         max(totalVotes, 1).
 */
export async function test_api_voting_activity_trends_basic_time_series(
  connection: api.IConnection,
) {
  // 1. Seed platform-level configuration as platformAdmin
  const adminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: `admin+${RandomGenerator.alphabets(8)}@example.com` as string &
          tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(adminJoin);

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphabets(6)}`,
          name: "Public Visibility",
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: `text-${RandomGenerator.alphabets(6)}`,
          name: "Text Post",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert(postType);

  // 2. Seed member content and votes as memberUser
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: `user+${RandomGenerator.alphabets(8)}@example.com` as string &
          tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(14),
        ip: "127.0.0.1",
        href: "https://app.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://app.example.com/" as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type_id: postType.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
          parentCommentId: undefined,
          renderingMode: "markdown",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: {
          community_platform_post_id: post.id,
          vote_value: 1,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(postVote);

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.commentVotes.create(
      connection,
      {
        body: {
          community_platform_comment_id: comment.id,
          vote_value: -1,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(commentVote);

  // 3. Build a simple 7-day window ending at now
  const now: Date = new Date();
  const endAt: string & tags.Format<"date-time"> = now.toISOString() as string &
    tags.Format<"date-time">;
  const sevenDaysMs: number = 7 * 24 * 60 * 60 * 1000;
  const startDate: Date = new Date(now.getTime() - sevenDaysMs);
  const startAt: string & tags.Format<"date-time"> =
    startDate.toISOString() as string & tags.Format<"date-time">;

  const requestBody = {
    startAt,
    endAt,
    granularity: "day",
    communityIds: undefined,
    includePostVotes: true,
    includeCommentVotes: true,
    contentTypes: undefined,
    maxBuckets: undefined,
  } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest;

  // 4. Invoke analytics endpoint and validate invariants
  const trends: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      { body: requestBody },
    );
  typia.assert(trends);

  // series must be non-empty
  TestValidator.predicate(
    "voting activity trends series should be non-empty",
    trends.series.length > 0,
  );

  // totalVotes equals sum of bucket.totalVotes across all series
  const sumBucketVotes: number = trends.series.reduce(
    (
      sumSeries: number,
      series: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsSeries,
    ) => {
      const seriesSum: number = series.buckets.reduce(
        (
          acc: number,
          bucket: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrendsBucket,
        ) => acc + bucket.totalVotes,
        0,
      );
      return sumSeries + seriesSum;
    },
    0,
  );

  TestValidator.equals(
    "trends.totalVotes should equal the sum of all bucket.totalVotes",
    trends.totalVotes,
    sumBucketVotes,
  );

  const epsilon = 1e-6;
  const requestStartMs: number = new Date(startAt).getTime();
  const requestEndMs: number = new Date(endAt).getTime();

  for (const series of trends.series) {
    let lastStartMs: number | null = null;

    for (const bucket of series.buckets) {
      const bucketStartMs: number = new Date(bucket.startAt).getTime();
      const bucketEndMs: number = new Date(bucket.endAt).getTime();

      // buckets ordered by startAt ascending
      if (lastStartMs !== null) {
        TestValidator.predicate(
          "bucket.startAt must be non-decreasing within series",
          bucketStartMs >= lastStartMs,
        );
      }
      lastStartMs = bucketStartMs;

      // bucket must not end before request start or start after request end in a backwards way
      TestValidator.predicate(
        "bucket interval should lie within a reasonable expansion of the requested window",
        bucketEndMs > bucketStartMs &&
          bucketEndMs >= requestStartMs &&
          bucketStartMs <= requestEndMs,
      );

      // totalVotes == upVotes + downVotes
      const votesSum: number = bucket.upVotes + bucket.downVotes;
      TestValidator.equals(
        "bucket.totalVotes should equal upVotes + downVotes",
        bucket.totalVotes,
        votesSum,
      );

      // upvoteRatio in [0,1]
      TestValidator.predicate(
        "bucket.upvoteRatio should be within [0,1]",
        bucket.upvoteRatio >= 0 - epsilon && bucket.upvoteRatio <= 1 + epsilon,
      );

      // upvoteRatio approx upVotes / max(totalVotes,1)
      const denom: number = bucket.totalVotes > 0 ? bucket.totalVotes : 1;
      const expectedRatio: number = bucket.upVotes / denom;
      const diff: number = Math.abs(bucket.upvoteRatio - expectedRatio);
      TestValidator.predicate(
        "bucket.upvoteRatio should approximately equal upVotes / max(totalVotes,1)",
        diff <= epsilon || bucket.totalVotes === 0,
      );
    }
  }
}
