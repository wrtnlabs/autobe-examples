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

export async function test_api_voting_activity_trends_post_vs_comment_segments(
  connection: api.IConnection,
) {
  // 1. Platform admin and member user setup
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/start",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 2. As platform admin, create visibility level and post type
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.console.local/login",
      referrer: "https://admin.console.local/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityLevelCreateBody = {
    code: `public_${RandomGenerator.alphabets(5)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreateBody },
    );
  typia.assert(visibilityLevel);

  const postTypeCreateBody = {
    code: `text_${RandomGenerator.alphabets(5)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: postTypeCreateBody },
    );
  typia.assert(postType);

  // 3. Switch to member user for community, post, comment, and votes
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: "127.0.0.1",
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/start",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  const commentCreateBody1 = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const comment1: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      { postId: post.id, body: commentCreateBody1 },
    );
  typia.assert(comment1);

  const commentCreateBody2 = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
    renderingMode: "plainText",
  } satisfies ICommunityPlatformComment.ICreate;

  const comment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      { postId: post.id, body: commentCreateBody2 },
    );
  typia.assert(comment2);

  // 4. Seed post and comment votes
  const postVoteBodies: ICommunityPlatformPostVote.ICreate[] = [
    {
      community_platform_post_id: post.id,
      vote_value: 1,
    },
    {
      community_platform_post_id: post.id,
      vote_value: 1,
    },
    {
      community_platform_post_id: post.id,
      vote_value: -1,
    },
  ];

  const commentVoteBodies: ICommunityPlatformCommentVote.ICreate[] = [
    {
      community_platform_comment_id: comment1.id,
      vote_value: 1,
    },
    {
      community_platform_comment_id: comment1.id,
      vote_value: 1,
    },
    {
      community_platform_comment_id: comment2.id,
      vote_value: -1,
    },
  ];

  for (const body of postVoteBodies) {
    const postVote: ICommunityPlatformPostVote =
      await api.functional.communityPlatform.memberUser.postVotes.create(
        connection,
        { body },
      );
    typia.assert(postVote);
  }

  for (const body of commentVoteBodies) {
    const commentVote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.commentVotes.create(
        connection,
        { body },
      );
    typia.assert(commentVote);
  }

  // 5. Compute time window around now (assuming votes just created)
  const now = new Date();
  const startAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const baseRequest: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest =
    {
      startAt,
      endAt,
      granularity: "day",
      communityIds: [community.id],
      includePostVotes: true,
      includeCommentVotes: true,
      contentTypes: undefined,
      maxBuckets: undefined,
    };

  // 6. Post-only analytics
  const postOnlyRequest = {
    ...baseRequest,
    includePostVotes: true,
    includeCommentVotes: false,
  } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest;

  const postOnlyStats: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      { body: postOnlyRequest },
    );
  typia.assert(postOnlyStats);

  // 7. Comment-only analytics
  const commentOnlyRequest = {
    ...baseRequest,
    includePostVotes: false,
    includeCommentVotes: true,
  } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest;

  const commentOnlyStats: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      { body: commentOnlyRequest },
    );
  typia.assert(commentOnlyStats);

  // 8. Combined analytics
  const combinedRequest = {
    ...baseRequest,
    includePostVotes: true,
    includeCommentVotes: true,
  } satisfies ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends.IRequest;

  const combinedStats: ICommunityPlatformVotingKarmaStatisticsVotingActivityTrends =
    await api.functional.communityPlatform.votingKarma.statistics.votingActivityTrends.index(
      connection,
      { body: combinedRequest },
    );
  typia.assert(combinedStats);

  const totalPostOnly = postOnlyStats.totalVotes;
  const totalCommentOnly = commentOnlyStats.totalVotes;
  const totalCombined = combinedStats.totalVotes;

  TestValidator.predicate(
    "post-only totalVotes should be positive",
    totalPostOnly > 0,
  );
  TestValidator.predicate(
    "comment-only totalVotes should be positive",
    totalCommentOnly > 0,
  );

  TestValidator.predicate(
    "combined totalVotes >= each individual source",
    totalCombined >= totalPostOnly && totalCombined >= totalCommentOnly,
  );

  TestValidator.equals(
    "combined totalVotes equals sum of post-only and comment-only totals",
    totalCombined,
    (totalPostOnly + totalCommentOnly) as typeof totalCombined,
  );

  const postSeries = postOnlyStats.series[0];
  const commentSeries = commentOnlyStats.series[0];
  const combinedSeries = combinedStats.series[0];

  if (
    postSeries !== undefined &&
    commentSeries !== undefined &&
    combinedSeries !== undefined &&
    postSeries.buckets.length === commentSeries.buckets.length &&
    postSeries.buckets.length === combinedSeries.buckets.length
  ) {
    const length = postSeries.buckets.length;
    for (let i = 0; i < length; i++) {
      const postBucket = postSeries.buckets[i];
      const commentBucket = commentSeries.buckets[i];
      const combinedBucket = combinedSeries.buckets[i];

      const expectedBucketTotal =
        postBucket.totalVotes + commentBucket.totalVotes;

      TestValidator.equals(
        `bucket[${i}] combined totalVotes equals sum of post and comment buckets`,
        combinedBucket.totalVotes,
        expectedBucketTotal as typeof combinedBucket.totalVotes,
      );
    }
  }
}
