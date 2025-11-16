import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformVoteTrendAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteTrendAnalytics";

export async function test_api_admin_vote_trend_analytics_bucket_and_granularity_behavior(
  connection: api.IConnection,
) {
  // 1. Register a member user (will be used for content and votes)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create a community as the member user
  const communityBody = {
    slug: `test-${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a membership for the same member in that community
  const membershipBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create one post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create several comments on the post
  const commentCount = 3;
  const comments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentBody,
        },
      );
    typia.assert<ICommunityPlatformComment>(comment);
    comments.push(comment);
  }

  // 6. Generate many vote events on post and comments
  const longWindowDays = 14;
  const now = new Date();
  const fromLong = new Date(
    now.getTime() - longWindowDays * 24 * 60 * 60 * 1000,
  );

  let totalUpvotes = 0;
  let totalDownvotes = 0;

  const voteIterations = 100;
  for (let i = 0; i < voteIterations; i++) {
    const direction = i % 2 === 0 ? "up" : "down";

    if (i % 2 === 0) {
      const voteBody = {
        direction,
      } satisfies ICommunityPlatformPostVote.ICreate;
      const postVote: ICommunityPlatformPostVote =
        await api.functional.communityPlatform.memberUser.posts.votes.create(
          connection,
          {
            postId: post.id,
            body: voteBody,
          },
        );
      typia.assert<ICommunityPlatformPostVote>(postVote);
    } else {
      const targetComment = comments[i % comments.length];
      const voteBody = {
        direction,
      } satisfies ICommunityPlatformCommentVote.ICreate;
      const commentVote: ICommunityPlatformCommentVote =
        await api.functional.communityPlatform.memberUser.comments.votes.create(
          connection,
          {
            commentId: targetComment.id,
            body: voteBody,
          },
        );
      typia.assert<ICommunityPlatformCommentVote>(commentVote);
    }

    if (direction === "up") totalUpvotes += 1;
    else totalDownvotes += 1;
  }

  const totalEvents = totalUpvotes + totalDownvotes;

  // 7. Join an admin user (this also authenticates as adminUser)
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphabets(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // 8. Long-window analytics request with granularity "hour" and maxBuckets
  const fromLongIso = fromLong.toISOString();
  const toLongIso = now.toISOString();

  const longRequestBody = {
    from: fromLongIso,
    to: toLongIso,
    granularity: "hour",
    communityIds: [community.id],
    memberUserIds: undefined,
    contentTypes: undefined,
    includeKarma: false,
    maxBuckets: 50,
  } satisfies ICommunityPlatformVoteTrendAnalytics.IRequest;

  const longResult: ICommunityPlatformVoteTrendAnalytics =
    await api.functional.communityPlatform.adminUser.analytics.votes.trends.index(
      connection,
      {
        body: longRequestBody,
      },
    );
  typia.assert<ICommunityPlatformVoteTrendAnalytics>(longResult);

  // 9. Validate long-range analytics behavior
  TestValidator.predicate(
    "long-range timeRange.from must be >= requested from",
    new Date(longResult.timeRange.from).getTime() >= fromLong.getTime(),
  );
  TestValidator.predicate(
    "long-range timeRange.to must be <= requested to",
    new Date(longResult.timeRange.to).getTime() <= now.getTime(),
  );

  const totalLongBuckets = longResult.series.reduce(
    (sum, s) => sum + s.buckets.length,
    0,
  );

  TestValidator.predicate(
    "long-range analytics should have some buckets",
    totalLongBuckets > 0,
  );

  const maxBuckets = longRequestBody.maxBuckets ?? 0;

  if (maxBuckets > 0) {
    TestValidator.predicate(
      "total buckets should not greatly exceed maxBuckets per series",
      totalLongBuckets <= maxBuckets * Math.max(1, longResult.series.length),
    );
  }

  if (longResult.metadata !== undefined) {
    const normalized = longResult.metadata.normalizedFilters;
    const metaGranularity = normalized?.granularity ?? longResult.granularity;

    TestValidator.predicate(
      "long-range granularity must be one of hour/day/week",
      metaGranularity === "hour" ||
        metaGranularity === "day" ||
        metaGranularity === "week",
    );

    if (metaGranularity === "day" || metaGranularity === "week") {
      TestValidator.predicate(
        "approximationApplied must be true when granularity is coarsened",
        longResult.metadata.approximationApplied === true,
      );
    }
  }

  const aggregateLong = longResult.series.reduce(
    (acc, s) => {
      for (const b of s.buckets) {
        acc.upvotes += b.upvotes;
        acc.downvotes += b.downvotes;
      }
      return acc;
    },
    { upvotes: 0, downvotes: 0 },
  );

  TestValidator.predicate(
    "aggregated long-range upvotes must be >= 0",
    aggregateLong.upvotes >= 0,
  );
  TestValidator.predicate(
    "aggregated long-range downvotes must be >= 0",
    aggregateLong.downvotes >= 0,
  );
  TestValidator.predicate(
    "aggregated long-range total events should not exceed created events",
    aggregateLong.upvotes + aggregateLong.downvotes <= totalEvents,
  );

  // 10. Short-window analytics request (hourly, no maxBuckets)
  const shortWindowHours = 24;
  const fromShort = new Date(now.getTime() - shortWindowHours * 60 * 60 * 1000);
  const fromShortIso = fromShort.toISOString();
  const toShortIso = now.toISOString();

  const shortRequestBody = {
    from: fromShortIso,
    to: toShortIso,
    granularity: "hour",
    communityIds: [community.id],
    memberUserIds: undefined,
    contentTypes: undefined,
    includeKarma: false,
    maxBuckets: undefined,
  } satisfies ICommunityPlatformVoteTrendAnalytics.IRequest;

  const shortResult: ICommunityPlatformVoteTrendAnalytics =
    await api.functional.communityPlatform.adminUser.analytics.votes.trends.index(
      connection,
      {
        body: shortRequestBody,
      },
    );
  typia.assert<ICommunityPlatformVoteTrendAnalytics>(shortResult);

  // 11. Validate short-range analytics behavior
  if (shortResult.metadata !== undefined) {
    TestValidator.predicate(
      "short-range approximationApplied should be false",
      shortResult.metadata.approximationApplied === false,
    );

    if (shortResult.metadata.normalizedFilters !== undefined) {
      TestValidator.equals(
        "short-range normalized granularity should remain hour",
        shortResult.metadata.normalizedFilters.granularity,
        "hour",
      );
    }
  }

  TestValidator.equals(
    "short-range top-level granularity should be hour",
    shortResult.granularity,
    "hour",
  );

  const effectiveFromShort = new Date(shortResult.timeRange.from);
  const effectiveToShort = new Date(shortResult.timeRange.to);
  const millisDiff = effectiveToShort.getTime() - effectiveFromShort.getTime();
  const expectedHours = Math.max(1, Math.round(millisDiff / (60 * 60 * 1000)));

  for (const s of shortResult.series) {
    TestValidator.predicate(
      "short-range bucket count per series should roughly match expected hours",
      s.buckets.length >= 1 && s.buckets.length <= expectedHours + 2,
    );
  }

  const aggregateShort = shortResult.series.reduce(
    (acc, s) => {
      for (const b of s.buckets) {
        acc.upvotes += b.upvotes;
        acc.downvotes += b.downvotes;
      }
      return acc;
    },
    { upvotes: 0, downvotes: 0 },
  );

  TestValidator.predicate(
    "aggregated short-range upvotes must be >= 0",
    aggregateShort.upvotes >= 0,
  );
  TestValidator.predicate(
    "aggregated short-range downvotes must be >= 0",
    aggregateShort.downvotes >= 0,
  );
  TestValidator.predicate(
    "aggregated short-range total events should not exceed created events",
    aggregateShort.upvotes + aggregateShort.downvotes <= totalEvents,
  );
}
