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

/**
 * Validate vote trend analytics scoping by community, member user, and content
 * type for both post and comment votes, including karma aggregation metadata.
 *
 * Business context: Admin users need to understand how voting activity and
 * karma evolve over time for specific communities, users, and content types.
 * The /communityPlatform/adminUser/analytics/votes/trends endpoint returns
 * time‑bucketed series describing upvotes, downvotes, net scores, and optional
 * karma deltas, segmented by dimensions like community and content type.
 *
 * This test builds a minimal but realistic dataset where two member users vote
 * in two different communities on both posts and comments. It then queries the
 * analytics endpoint with different scopes to ensure that:
 *
 * - CommunityIds filter restricts analytics to the chosen community
 * - MemberUserIds filter restricts analytics to votes from the given member
 * - ContentTypes filter splits post vs comment votes
 * - IncludeKarma=true results in karmaDelta being present on at least some
 *   buckets
 * - Series dimension metadata (key, communityId, contentType) is consistent with
 *   the requested filters
 *
 * High‑level steps:
 *
 * 1. Create an adminUser account (join) to authorize admin analytics.
 * 2. Create two member users: voter1 and voter2.
 * 3. As voter1, create two communities (A and B) and record ids/slugs.
 * 4. Create memberships so voter1 belongs to community A and voter2 to community
 *    B.
 * 5. Create a post and comment in each community and cast votes:
 *
 *    - Voter1 upvotes a post and its comment in community A
 *    - Voter2 upvotes a post and its comment in community B
 * 6. As adminUser, call vote trend analytics twice:
 *
 *    - Scope 1: communityIds=[A.id], memberUserIds=[voter1.id],
 *         contentTypes=["post"], includeKarma=true
 *    - Scope 2: communityIds=[B.id], memberUserIds=[voter2.id],
 *         contentTypes=["comment"], includeKarma=true
 * 7. Validate that returned series are non‑empty and that:
 *
 *    - All series for Scope 1 are constrained to community A and post content type
 *         (no comment‑only series with mismatched type), and aggregated
 *         upvotes/downvotes reflect at least one vote from voter1 on posts.
 *    - All series for Scope 2 are constrained to community B and comment content
 *         type, and aggregated upvotes/downvotes reflect at least one vote from
 *         voter2 on comments.
 *    - Where includeKarma=true, at least one bucket exposes karmaDelta.
 */
export async function test_api_admin_vote_trend_analytics_with_scopes_and_content_types(
  connection: api.IConnection,
) {
  // Utility to create unique emails and usernames for test users
  const uniqueSuffix: string = RandomGenerator.alphaNumeric(8);

  // 1. Create adminUser and obtain authorized context
  const adminJoinRequest = {
    username: `admin_${uniqueSuffix}`,
    email: `admin_${uniqueSuffix}@example.com`,
    password: "AdminPassw0rd!", // Format<"password"> is just a tagged string
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create two member users: voter1 and voter2
  const memberHref: string = "https://example.com/join";
  const memberReferrer: string = "https://example.com/landing";

  const voter1Join = {
    username: `voter1_${uniqueSuffix}`,
    email: `voter1_${uniqueSuffix}@example.com`,
    password: "Voter1Passw0rd!",
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const voter1Authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: voter1Join });
  typia.assert(voter1Authorized);

  const voter2Join = {
    username: `voter2_${uniqueSuffix}`,
    email: `voter2_${uniqueSuffix}@example.com`,
    password: "Voter2Passw0rd!",
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const voter2Authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: voter2Join });
  typia.assert(voter2Authorized);

  // 3. As voter1, create two communities (A and B)
  // Switch auth to voter1 via login to ensure memberUser context
  const voter1LoginRequest = {
    identifier: voter1Join.email,
    password: voter1Join.password,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const voter1Login: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: voter1LoginRequest,
    });
  typia.assert(voter1Login);

  const communityASlug = `community-a-${uniqueSuffix}`;
  const communityARequest = {
    slug: communityASlug,
    name: `Community A ${uniqueSuffix}`,
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

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityARequest },
    );
  typia.assert(communityA);

  const communityBSlug = `community-b-${uniqueSuffix}`;
  const communityBRequest = {
    slug: communityBSlug,
    name: `Community B ${uniqueSuffix}`,
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

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBRequest },
    );
  typia.assert(communityB);

  // 4. Create memberships: voter1 in A, voter2 in B
  // voter1 already logged in; create membership in community A
  const membershipARequest = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityA.slug,
        body: membershipARequest,
      },
    );
  typia.assert(membershipA);

  // Switch to voter2 and join community B
  const voter2LoginRequest = {
    identifier: voter2Join.email,
    password: voter2Join.password,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const voter2Login: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: voter2LoginRequest,
    });
  typia.assert(voter2Login);

  const membershipBRequest = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityB.slug,
        body: membershipBRequest,
      },
    );
  typia.assert(membershipB);

  // 5. Create posts, comments, and votes in each community
  // Helper to create a simple text post in a given community
  const createPostInCommunity = async (
    community: ICommunityPlatformCommunity,
  ): Promise<ICommunityPlatformPost> => {
    const postRequest = {
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.paragraph({ sentences: 8 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: postRequest },
      );
    typia.assert(post);
    return post;
  };

  // Helper to create a comment on a post
  const createCommentOnPost = async (
    post: ICommunityPlatformPost,
  ): Promise<ICommunityPlatformComment> => {
    const commentRequest = {
      content: RandomGenerator.paragraph({ sentences: 4 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentRequest,
        },
      );
    typia.assert(comment);
    return comment;
  };

  // Helper to cast an upvote on a post
  const upvotePost = async (post: ICommunityPlatformPost): Promise<void> => {
    const voteRequest = {
      direction: "up",
    } satisfies ICommunityPlatformPostVote.ICreate;

    const vote: ICommunityPlatformPostVote =
      await api.functional.communityPlatform.memberUser.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: voteRequest,
        },
      );
    typia.assert(vote);
  };

  // Helper to cast an upvote on a comment
  const upvoteComment = async (
    comment: ICommunityPlatformComment,
  ): Promise<void> => {
    const voteRequest = {
      direction: "up",
    } satisfies ICommunityPlatformCommentVote.ICreate;

    const vote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: voteRequest,
        },
      );
    typia.assert(vote);
  };

  // As voter2 (current login), create content in community B and vote
  const postB: ICommunityPlatformPost = await createPostInCommunity(communityB);
  const commentB: ICommunityPlatformComment = await createCommentOnPost(postB);
  await upvotePost(postB);
  await upvoteComment(commentB);

  // Switch back to voter1 to create content in community A and vote
  const voter1Relogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: voter1LoginRequest,
    });
  typia.assert(voter1Relogin);

  const postA: ICommunityPlatformPost = await createPostInCommunity(communityA);
  const commentA: ICommunityPlatformComment = await createCommentOnPost(postA);
  await upvotePost(postA);
  await upvoteComment(commentA);

  // 6. Build analytics request window (from yesterday to tomorrow)
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  // Switch connection back to adminUser context for analytics
  const adminLoginRequest = {
    identifier: adminJoinRequest.email,
    password: adminJoinRequest.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminLogin);

  // 7. Analytics scope 1: posts by voter1 in community A
  const requestPostScopeA = {
    from: fromIso as string & tags.Format<"date-time">,
    to: toIso as string & tags.Format<"date-time">,
    granularity: "day" as const,
    communityIds: [communityA.id],
    memberUserIds: [voter1Authorized.id],
    contentTypes: ["post"],
    includeKarma: true,
    maxBuckets: undefined,
  } satisfies ICommunityPlatformVoteTrendAnalytics.IRequest;

  const analyticsPostA: ICommunityPlatformVoteTrendAnalytics =
    await api.functional.communityPlatform.adminUser.analytics.votes.trends.index(
      connection,
      { body: requestPostScopeA },
    );
  typia.assert(analyticsPostA);

  // Basic structural validations
  TestValidator.predicate(
    "post analytics for community A should have at least one series",
    analyticsPostA.series.length > 0,
  );

  // Ensure the effective time range is not inverted
  TestValidator.predicate(
    "analytics timeRange.from should be <= timeRange.to",
    new Date(analyticsPostA.timeRange.from).getTime() <=
      new Date(analyticsPostA.timeRange.to).getTime(),
  );

  // Validate scoping and aggregation for post-only analytics
  let totalPostUpvotesA = 0;
  let totalPostDownvotesA = 0;
  let anyPostKarmaBucketA = false;

  for (const series of analyticsPostA.series) {
    // communityId, if present, must equal communityA.id
    if (series.communityId !== undefined) {
      TestValidator.equals(
        "series communityId must match community A",
        series.communityId,
        communityA.id,
      );
    }

    // contentType, if defined and non-null, must be "post" for post-only filter
    if (series.contentType !== undefined && series.contentType !== null) {
      TestValidator.equals(
        "series contentType in post scope must be 'post'",
        series.contentType,
        "post",
      );
    }

    // key must be non-empty
    TestValidator.predicate(
      "series key should be non-empty string",
      typeof series.key === "string" && series.key.length > 0,
    );

    for (const bucket of series.buckets) {
      totalPostUpvotesA += bucket.upvotes;
      totalPostDownvotesA += bucket.downvotes;
      if (bucket.karmaDelta !== undefined) anyPostKarmaBucketA = true;
    }
  }

  TestValidator.predicate(
    "total upvotes in post scope A should be at least 1",
    totalPostUpvotesA >= 1,
  );
  TestValidator.predicate(
    "total downvotes in post scope A should be >= 0",
    totalPostDownvotesA >= 0,
  );
  TestValidator.predicate(
    "at least one bucket in post scope A should have karmaDelta when includeKarma=true",
    anyPostKarmaBucketA,
  );

  // 8. Analytics scope 2: comments by voter2 in community B
  const requestCommentScopeB = {
    from: fromIso as string & tags.Format<"date-time">,
    to: toIso as string & tags.Format<"date-time">,
    granularity: "day" as const,
    communityIds: [communityB.id],
    memberUserIds: [voter2Authorized.id],
    contentTypes: ["comment"],
    includeKarma: true,
    maxBuckets: undefined,
  } satisfies ICommunityPlatformVoteTrendAnalytics.IRequest;

  const analyticsCommentB: ICommunityPlatformVoteTrendAnalytics =
    await api.functional.communityPlatform.adminUser.analytics.votes.trends.index(
      connection,
      { body: requestCommentScopeB },
    );
  typia.assert(analyticsCommentB);

  TestValidator.predicate(
    "comment analytics for community B should have at least one series",
    analyticsCommentB.series.length > 0,
  );

  TestValidator.predicate(
    "comment analytics timeRange.from should be <= timeRange.to",
    new Date(analyticsCommentB.timeRange.from).getTime() <=
      new Date(analyticsCommentB.timeRange.to).getTime(),
  );

  let totalCommentUpvotesB = 0;
  let totalCommentDownvotesB = 0;
  let anyCommentKarmaBucketB = false;

  for (const series of analyticsCommentB.series) {
    if (series.communityId !== undefined) {
      TestValidator.equals(
        "series communityId must match community B",
        series.communityId,
        communityB.id,
      );
    }

    if (series.contentType !== undefined && series.contentType !== null) {
      TestValidator.equals(
        "series contentType in comment scope must be 'comment'",
        series.contentType,
        "comment",
      );
    }

    TestValidator.predicate(
      "series key in comment scope should be non-empty string",
      typeof series.key === "string" && series.key.length > 0,
    );

    for (const bucket of series.buckets) {
      totalCommentUpvotesB += bucket.upvotes;
      totalCommentDownvotesB += bucket.downvotes;
      if (bucket.karmaDelta !== undefined) anyCommentKarmaBucketB = true;
    }
  }

  TestValidator.predicate(
    "total upvotes in comment scope B should be at least 1",
    totalCommentUpvotesB >= 1,
  );
  TestValidator.predicate(
    "total downvotes in comment scope B should be >= 0",
    totalCommentDownvotesB >= 0,
  );
  TestValidator.predicate(
    "at least one bucket in comment scope B should have karmaDelta when includeKarma=true",
    anyCommentKarmaBucketB,
  );
}
