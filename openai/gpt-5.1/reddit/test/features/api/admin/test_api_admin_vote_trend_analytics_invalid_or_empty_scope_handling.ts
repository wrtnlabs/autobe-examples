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

export async function test_api_admin_vote_trend_analytics_invalid_or_empty_scope_handling(
  connection: api.IConnection,
) {
  // 1. Prepare baseline data with a real member user, community, post, comment, and votes

  // 1-1. Register a member user and obtain authorized context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 1-2. Create a community as the member user
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
      {
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 1-3. Join the created community
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
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

  // 1-4. Create a post in this community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 1-5. Create a comment on that post
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

  // 1-6. Cast a vote on the post
  const postVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postVoteBody,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(postVote);

  // 1-7. Cast a vote on the comment
  const commentVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: commentVoteBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(commentVote);

  // 2. Create an admin user and authenticate as admin for analytics calls
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPwd#" + RandomGenerator.alphaNumeric(8),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Now the connection carries admin Authorization header for subsequent analytics calls.

  // Helper to inspect that all buckets in all series are zeroed.
  const assertZeroSeries = (
    analytics: ICommunityPlatformVoteTrendAnalytics,
  ) => {
    analytics.series.forEach((s, idx) => {
      s.buckets.forEach((b, bIdx) => {
        TestValidator.equals(
          `series[${idx}].buckets[${bIdx}].upvotes should be 0 in empty scope`,
          b.upvotes,
          0,
        );
        TestValidator.equals(
          `series[${idx}].buckets[${bIdx}].downvotes should be 0 in empty scope`,
          b.downvotes,
          0,
        );
        TestValidator.equals(
          `series[${idx}].buckets[${bIdx}].netScore should be 0 in empty scope`,
          b.netScore,
          0,
        );
        if (b.karmaDelta !== undefined) {
          TestValidator.equals(
            `series[${idx}].buckets[${bIdx}].karmaDelta should be 0 in empty scope`,
            b.karmaDelta,
            0,
          );
        }
      });
    });
  };

  // 3. Scenario A – future empty window
  const now = new Date();
  const futureStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const futureEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000); // +8 days

  const futureRequestBody = {
    from: futureStart.toISOString(),
    to: futureEnd.toISOString(),
    granularity: "day" as const,
    communityIds: [community.id],
    memberUserIds: [memberUser.id],
    contentTypes: ["post", "comment"],
    includeKarma: true,
    maxBuckets: undefined,
  } satisfies ICommunityPlatformVoteTrendAnalytics.IRequest;

  const futureAnalytics: ICommunityPlatformVoteTrendAnalytics =
    await api.functional.communityPlatform.adminUser.analytics.votes.trends.index(
      connection,
      {
        body: futureRequestBody,
      },
    );
  typia.assert<ICommunityPlatformVoteTrendAnalytics>(futureAnalytics);

  // basic sanity for time range and granularity
  TestValidator.equals(
    "granularity should reflect requested 'day' in future window",
    futureAnalytics.granularity,
    "day",
  );

  // metadata expectations for empty future range
  if (futureAnalytics.metadata !== undefined) {
    TestValidator.equals(
      "future window totalEvents should be 0",
      futureAnalytics.metadata.totalEvents,
      0,
    );
    TestValidator.equals(
      "future window approximationApplied should be false",
      futureAnalytics.metadata.approximationApplied,
      false,
    );

    if (futureAnalytics.metadata.normalizedFilters !== undefined) {
      const nf = futureAnalytics.metadata
        .normalizedFilters as ICommunityPlatformVoteTrendAnalytics.INormalizedFilters;
      // normalized filter includeKarma should reflect true
      TestValidator.equals(
        "normalizedFilters.includeKarma should be true for future window",
        nf.includeKarma,
        true,
      );
    }
  }

  // If the server responds with series but empty counts, validate they are zeroed.
  if (futureAnalytics.series.length > 0) {
    assertZeroSeries(futureAnalytics);
  }

  // 4. Scenario B – invalid scope IDs with a window that covers our real votes
  const pastStart = new Date(now.getTime() - 60 * 60 * 1000); // -1 hour
  const nearFutureEnd = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

  const bogusCommunityId = typia.random<string & tags.Format<"uuid">>();
  const bogusMemberUserId = typia.random<string & tags.Format<"uuid">>();

  const invalidScopeRequestBody = {
    from: pastStart.toISOString(),
    to: nearFutureEnd.toISOString(),
    granularity: "day" as const,
    communityIds: [bogusCommunityId],
    memberUserIds: [bogusMemberUserId],
    contentTypes: ["post", "comment"],
    includeKarma: true,
    maxBuckets: undefined,
  } satisfies ICommunityPlatformVoteTrendAnalytics.IRequest;

  const invalidScopeAnalytics: ICommunityPlatformVoteTrendAnalytics =
    await api.functional.communityPlatform.adminUser.analytics.votes.trends.index(
      connection,
      {
        body: invalidScopeRequestBody,
      },
    );
  typia.assert<ICommunityPlatformVoteTrendAnalytics>(invalidScopeAnalytics);

  if (invalidScopeAnalytics.metadata !== undefined) {
    TestValidator.equals(
      "invalid scope totalEvents should be 0",
      invalidScopeAnalytics.metadata.totalEvents,
      0,
    );
    TestValidator.equals(
      "invalid scope approximationApplied should be false",
      invalidScopeAnalytics.metadata.approximationApplied,
      false,
    );

    if (invalidScopeAnalytics.metadata.normalizedFilters !== undefined) {
      const nf = invalidScopeAnalytics.metadata
        .normalizedFilters as ICommunityPlatformVoteTrendAnalytics.INormalizedFilters;
      if (nf.communityIds !== undefined && nf.communityIds.length > 0) {
        TestValidator.equals(
          "normalizedFilters.communityIds should contain bogusCommunityId",
          nf.communityIds[0],
          bogusCommunityId,
        );
      }
      if (nf.memberUserIds !== undefined && nf.memberUserIds.length > 0) {
        TestValidator.equals(
          "normalizedFilters.memberUserIds should contain bogusMemberUserId",
          nf.memberUserIds[0],
          bogusMemberUserId,
        );
      }
    }
  }

  if (invalidScopeAnalytics.series.length > 0) {
    assertZeroSeries(invalidScopeAnalytics);
  }

  // 5. Scenario C – invalid time range (from > to) should be handled as a validation error, not 5xx
  const invalidFrom = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h
  const invalidTo = new Date(now.getTime() + 1 * 60 * 60 * 1000); // +1h

  const invalidRangeRequestBody = {
    from: invalidFrom.toISOString(),
    to: invalidTo.toISOString(),
    granularity: "day" as const,
    communityIds: undefined,
    memberUserIds: undefined,
    contentTypes: undefined,
    includeKarma: true,
    maxBuckets: undefined,
  } satisfies ICommunityPlatformVoteTrendAnalytics.IRequest;

  await TestValidator.error(
    "invalid time range (from > to) should result in a handled error (4xx, not 5xx)",
    async () => {
      await api.functional.communityPlatform.adminUser.analytics.votes.trends.index(
        connection,
        {
          body: invalidRangeRequestBody,
        },
      );
    },
  );
}
