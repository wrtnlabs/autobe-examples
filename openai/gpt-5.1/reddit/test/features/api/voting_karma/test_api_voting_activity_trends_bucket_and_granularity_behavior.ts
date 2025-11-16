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

export async function test_api_voting_activity_trends_bucket_and_granularity_behavior(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a platform admin
  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  // 2. Create a community visibility level as platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphabets(5)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Test Visibility",
          description: "Visibility level for voting activity trends test",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type as platformAdmin
  const postTypeCode = `text-${RandomGenerator.alphabets(5)}`;
  const postType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: postTypeCode,
          name: "Text Post Type for Trends Test",
          description: "Simple text post type used in voting trends tests",
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert(postType);

  // 4. Create and authenticate a member user (join already authenticates)
  const memberJoinEmail = typia.random<string & tags.Format<"email">>();
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberJoinEmail,
      password: RandomGenerator.alphaNumeric(12),
      ip: "127.0.0.1",
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/home",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  // 5. Create a community as the member user using the configured visibility level
  const communityIdentifier = `trends-${RandomGenerator.alphabets(8)}`;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: "Voting Activity Trends Test Community",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create a post in the community
  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type_id: postType.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        url: undefined,
        image_uri: undefined,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 7. Create a comment under the post
  const comment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: undefined,
          renderingMode: "markdown",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 8. Seed a moderate volume of post votes and comment votes
  const postVoteCount = 20;
  const commentVoteCount = 10;

  // Alternate +1 and -1 votes to exercise both directions
  for (let i = 0; i < postVoteCount; i += 1) {
    const voteValue: number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1> = (i % 2 === 0 ? 1 : -1) as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>;

    const postVote =
      await api.functional.communityPlatform.memberUser.postVotes.create(
        connection,
        {
          body: {
            community_platform_post_id: post.id,
            vote_value: voteValue,
          } satisfies ICommunityPlatformPostVote.ICreate,
        },
      );
    typia.assert(postVote);
  }

  for (let i = 0; i < commentVoteCount; i += 1) {
    const voteValue: number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1> = (i % 2 === 0 ? 1 : -1) as number &
      tags.Type<"int32"> &
      tags.Minimum<-1> &
      tags.Maximum<1>;

    const commentVote =
      await api.functional.communityPlatform.memberUser.commentVotes.create(
        connection,
        {
          body: {
            community_platform_comment_id: comment.id,
            vote_value: voteValue,
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    typia.assert(commentVote);
  }

  // Total votes we expect analytics to see (within the chosen time window)
  const expectedTotalVotes = postVoteCount + commentVoteCount;

  // 9. Define a 14-day window ending at now
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);

  const startAtIso = startDate.toISOString();
  const endAtIso = endDate.toISOString();

  // Helper to compute the sum of totalVotes over all series and buckets
  const sumTotalVotesFromBuckets = (
    trends: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends,
  ): number => {
    return trends.series.reduce((seriesAcc, s) => {
      const bucketSum = s.buckets.reduce(
        (bucketAcc, b) => bucketAcc + b.totalVotes,
        0,
      );
      return seriesAcc + bucketSum;
    }, 0);
  };

  const getBucketCountFromFirstSeries = (
    trends: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends,
  ): number => {
    if (trends.series.length === 0) return 0;
    return trends.series[0]?.buckets.length ?? 0;
  };

  // 10. Call analytics with granularity "day", no maxBuckets
  const dayTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      {
        body: {
          startAt: startAtIso,
          endAt: endAtIso,
          granularity: "day",
          communityIds: [community.id],
          includePostVotes: true,
          includeCommentVotes: true,
          contentTypes: undefined,
          maxBuckets: undefined,
        } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest,
      },
    );
  typia.assert(dayTrends);

  // Ensure we have at least one series and bucket
  TestValidator.predicate(
    "day granularity should return at least one series",
    dayTrends.series.length > 0,
  );

  const bucketCountDay = getBucketCountFromFirstSeries(dayTrends);
  TestValidator.predicate(
    "day granularity should return at least one bucket in first series",
    bucketCountDay > 0,
  );

  const totalFromDayBuckets = sumTotalVotesFromBuckets(dayTrends);
  TestValidator.equals(
    "day granularity response.totalVotes equals sum of bucket totalVotes",
    dayTrends.totalVotes,
    totalFromDayBuckets,
  );

  // 11. Call analytics with granularity "week" and same window
  const weekTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      {
        body: {
          startAt: startAtIso,
          endAt: endAtIso,
          granularity: "week",
          communityIds: [community.id],
          includePostVotes: true,
          includeCommentVotes: true,
          contentTypes: undefined,
          maxBuckets: undefined,
        } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest,
      },
    );
  typia.assert(weekTrends);

  TestValidator.predicate(
    "week granularity should return at least one series",
    weekTrends.series.length > 0,
  );

  const bucketCountWeek = getBucketCountFromFirstSeries(weekTrends);
  TestValidator.predicate(
    "week granularity should return at least one bucket in first series",
    bucketCountWeek > 0,
  );

  // Week granularity should not have more buckets than day granularity for
  // the same window
  TestValidator.predicate(
    "week granularity should have bucket count <= day granularity",
    bucketCountWeek <= bucketCountDay,
  );

  const totalFromWeekBuckets = sumTotalVotesFromBuckets(weekTrends);
  TestValidator.equals(
    "week granularity response.totalVotes equals sum of bucket totalVotes",
    weekTrends.totalVotes,
    totalFromWeekBuckets,
  );

  // Ensure that day and week views cover the same underlying votes
  TestValidator.equals(
    "day and week granularity totalVotes should be equal",
    weekTrends.totalVotes,
    dayTrends.totalVotes,
  );

  // 12. Call analytics with granularity "day" and maxBuckets = 5
  const maxBucketsValue: number & tags.Type<"int32"> = 5 as number &
    tags.Type<"int32">;

  const dayTrendsMaxBuckets =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      {
        body: {
          startAt: startAtIso,
          endAt: endAtIso,
          granularity: "day",
          communityIds: [community.id],
          includePostVotes: true,
          includeCommentVotes: true,
          contentTypes: undefined,
          maxBuckets: maxBucketsValue,
        } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest,
      },
    );
  typia.assert(dayTrendsMaxBuckets);

  TestValidator.predicate(
    "day + maxBuckets should return at least one series",
    dayTrendsMaxBuckets.series.length > 0,
  );

  const bucketCountMax = getBucketCountFromFirstSeries(dayTrendsMaxBuckets);
  TestValidator.predicate(
    "day + maxBuckets first series should have > 0 buckets",
    bucketCountMax > 0,
  );
  TestValidator.predicate(
    "day + maxBuckets first series bucket count should be <= maxBuckets",
    bucketCountMax <= maxBucketsValue,
  );

  const totalFromDayMaxBuckets = sumTotalVotesFromBuckets(dayTrendsMaxBuckets);
  TestValidator.equals(
    "day + maxBuckets response.totalVotes equals sum of bucket totalVotes",
    dayTrendsMaxBuckets.totalVotes,
    totalFromDayMaxBuckets,
  );

  // Ensure that maxBuckets does not change the underlying total votes in the
  // window compared to unconstrained day granularity
  TestValidator.equals(
    "day unconstrained and day+maxBuckets totalVotes should be equal",
    dayTrendsMaxBuckets.totalVotes,
    dayTrends.totalVotes,
  );

  // Optional: sanity check that totalVotes is at least the number of votes we
  // created, acknowledging that preexisting votes may increase this number.
  TestValidator.predicate(
    "totalVotes should be at least the number of newly created votes",
    dayTrends.totalVotes >= expectedTotalVotes,
  );
}
