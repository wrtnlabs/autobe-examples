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
import type { ICommunityPlatformKarmaByContentStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByContentStatistics";
import type { ICommunityPlatformKarmaByContentStatisticsTopComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByContentStatisticsTopComment";
import type { ICommunityPlatformKarmaByContentStatisticsTopPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaByContentStatisticsTopPost";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaByContentStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaByContentStatistics";

export async function test_api_admin_karma_by_content_statistics_with_filters_and_sorting(
  connection: api.IConnection,
) {
  // Create two member users (author1, author2) with stored passwords
  const author1Password = RandomGenerator.alphaNumeric(12);
  const author1Join = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: `author1+${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: author1Password,
      ip: null,
      href: "https://client.example.com/register",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(author1Join);

  const author2Password = RandomGenerator.alphaNumeric(12);
  const author2Join = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: `author2+${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: author2Password,
      ip: null,
      href: "https://client.example.com/register",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(author2Join);

  // Ensure authenticated as author1 to create communities and author1-side content
  const author1Login = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: author1Join.email,
      password: author1Password,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(author1Login);

  // Baseline time before content creation for later createdFrom/createdTo window
  const windowStart = new Date();

  // Create two communities as author1
  const communityASlug = `comm-a-${RandomGenerator.alphaNumeric(6)}`;
  const communityA =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          slug: communityASlug,
          name: "Community A",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          status: "active",
          is_nsfw: false,
          is_quarantined: false,
          is_posting_restricted: false,
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: false,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityA);

  const communityBSlug = `comm-b-${RandomGenerator.alphaNumeric(6)}`;
  const communityB =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          slug: communityBSlug,
          name: "Community B",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          status: "active",
          is_nsfw: false,
          is_quarantined: false,
          is_posting_restricted: false,
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: false,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(communityB);

  // Create memberships: author1 in community A
  const membershipAForAuthor1 =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityASlug,
        body: {
          role: "member",
          isApproved: true,
          isBanned: false,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipAForAuthor1);

  // Create posts and comments in community A as author1
  const postAHigh =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        communityId: communityA.id,
        communityCode: communityASlug,
        title: "High karma post in community A",
        body: RandomGenerator.paragraph({ sentences: 8 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert<ICommunityPlatformPost>(postAHigh);

  const postALow =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        communityId: communityA.id,
        communityCode: communityASlug,
        title: "Lower karma post in community A",
        body: RandomGenerator.paragraph({ sentences: 4 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert<ICommunityPlatformPost>(postALow);

  const commentAHigh =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postAHigh.id as string & tags.Format<"uuid">,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parentCommentId: undefined,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(commentAHigh);

  const commentALow =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postALow.id as string & tags.Format<"uuid">,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: undefined,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(commentALow);

  // Apply votes on posts and comments in community A for score variance
  const upDirection = "up" as const;
  const downDirection = "down" as const;

  // High score post: multiple upvotes
  await ArrayUtil.asyncRepeat(3, async () => {
    const vote =
      await api.functional.communityPlatform.memberUser.posts.votes.create(
        connection,
        {
          postId: postAHigh.id as string & tags.Format<"uuid">,
          body: {
            direction: upDirection,
          } satisfies ICommunityPlatformPostVote.ICreate,
        },
      );
    typia.assert<ICommunityPlatformPostVote>(vote);
  });

  // Low score post: one downvote
  const postALowVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: postALow.id as string & tags.Format<"uuid">,
        body: {
          direction: downDirection,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(postALowVote);

  // High score comment: multiple upvotes
  await ArrayUtil.asyncRepeat(3, async () => {
    const vote =
      await api.functional.communityPlatform.memberUser.comments.votes.create(
        connection,
        {
          commentId: commentAHigh.id as string & tags.Format<"uuid">,
          body: {
            direction: upDirection,
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    typia.assert<ICommunityPlatformCommentVote>(vote);
  });

  // Low score comment: one downvote
  const commentALowVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentALow.id as string & tags.Format<"uuid">,
        body: {
          direction: downDirection,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(commentALowVote);

  // Switch to author2 and create content in community B
  const author2Login = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: author2Join.email,
      password: author2Password,
      ip: null,
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(author2Login);

  const membershipBForAuthor2 =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityBSlug,
        body: {
          role: "member",
          isApproved: true,
          isBanned: false,
        } satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membershipBForAuthor2);

  const postB = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        communityId: communityB.id,
        communityCode: communityBSlug,
        title: "Post in community B",
        body: RandomGenerator.paragraph({ sentences: 3 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert<ICommunityPlatformPost>(postB);

  const commentB =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postB.id as string & tags.Format<"uuid">,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: undefined,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(commentB);

  const postBVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: postB.id as string & tags.Format<"uuid">,
        body: {
          direction: upDirection,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(postBVote);

  const commentBVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: commentB.id as string & tags.Format<"uuid">,
        body: {
          direction: upDirection,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(commentBVote);

  // Mark end of content creation window
  const windowEnd = new Date();

  // Create an admin user and authenticate
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: `admin-${RandomGenerator.alphaNumeric(6)}`,
      email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: adminPassword as string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: {
      identifier: adminJoin.email,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformAdminUserLogin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // Helper: ISO window strings for createdFrom/createdTo
  const createdFrom = windowStart.toISOString();
  const createdTo = new Date(windowEnd.getTime() + 1000).toISOString();

  // 1st analytics call: filter by community A, author1, posts only
  const minScore = 1 as number & tags.Type<"int32">;
  const requestPostsOnly = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    communityIds: [communityA.id as string & tags.Format<"uuid">],
    authorIds: [author1Join.id as string & tags.Format<"uuid">],
    contentTypes: ["post"],
    minScore,
    maxScore: undefined,
    minVoteCount: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: "score" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformKarmaByContentStatistics.IRequest;

  const postsOnlyPage =
    await api.functional.communityPlatform.adminUser.statistics.karma.byContent.index(
      connection,
      {
        body: requestPostsOnly,
      },
    );
  typia.assert<IPageICommunityPlatformKarmaByContentStatistics.ISummary>(
    postsOnlyPage,
  );

  // Basic assertions on pagination
  TestValidator.predicate(
    "posts-only analytics returns non-negative record count",
    postsOnlyPage.pagination.records >= 0,
  );

  // Since ISummary is aggregate-level, we restrict assertions to filter coherence
  await ArrayUtil.asyncForEach(postsOnlyPage.data, async (summary, index) => {
    typia.assert<ICommunityPlatformKarmaByContentStatistics.ISummary>(summary);
    TestValidator.predicate(
      `summary[${index}] has non-negative totalPostKarma`,
      summary.totalPostKarma >= 0,
    );
    TestValidator.predicate(
      `summary[${index}] has non-negative totalCommentKarma`,
      summary.totalCommentKarma >= 0,
    );

    // Ensure topPosts, if any, belong to community A and not community B
    await ArrayUtil.asyncForEach(summary.topPosts, async (topPost, tIndex) => {
      typia.assert<ICommunityPlatformKarmaByContentStatisticsTopPost.ISummary>(
        topPost,
      );
      TestValidator.equals(
        `topPost[${index},${tIndex}] communityId matches community A`,
        topPost.communityId,
        communityA.id,
      );
      TestValidator.equals(
        `topPost[${index},${tIndex}] authorUserId matches author1`,
        topPost.authorUserId,
        author1Join.id,
      );
      TestValidator.predicate(
        `topPost[${index},${tIndex}] totalKarma >= 0`,
        topPost.totalKarma >= 0,
      );
    });

    // Ensure topComments, if any, also bound to community A and author1 when present
    await ArrayUtil.asyncForEach(
      summary.topComments,
      async (topComment, cIndex) => {
        typia.assert<ICommunityPlatformKarmaByContentStatisticsTopComment.ISummary>(
          topComment,
        );
        TestValidator.equals(
          `topComment[${index},${cIndex}] communityId matches community A`,
          topComment.communityId,
          communityA.id,
        );
        TestValidator.equals(
          `topComment[${index},${cIndex}] authorUserId matches author1`,
          topComment.authorUserId,
          author1Join.id,
        );
        TestValidator.predicate(
          `topComment[${index},${cIndex}] totalKarma >= 0`,
          topComment.totalKarma >= 0,
        );
      },
    );
  });

  // 2nd analytics call: comments only in time window for community A + author1
  const requestCommentsOnly = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    communityIds: [communityA.id as string & tags.Format<"uuid">],
    authorIds: [author1Join.id as string & tags.Format<"uuid">],
    contentTypes: ["comment"],
    minScore: undefined,
    maxScore: undefined,
    minVoteCount: undefined,
    createdFrom,
    createdTo,
    sortBy: "score" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformKarmaByContentStatistics.IRequest;

  const commentsOnlyPage =
    await api.functional.communityPlatform.adminUser.statistics.karma.byContent.index(
      connection,
      {
        body: requestCommentsOnly,
      },
    );
  typia.assert<IPageICommunityPlatformKarmaByContentStatistics.ISummary>(
    commentsOnlyPage,
  );

  TestValidator.predicate(
    "comments-only analytics returns non-negative record count",
    commentsOnlyPage.pagination.records >= 0,
  );

  await ArrayUtil.asyncForEach(
    commentsOnlyPage.data,
    async (summary, index) => {
      typia.assert<ICommunityPlatformKarmaByContentStatistics.ISummary>(
        summary,
      );
      // Focus on topComments for comment-type analytics
      await ArrayUtil.asyncForEach(
        summary.topComments,
        async (topComment, cIndex) => {
          typia.assert<ICommunityPlatformKarmaByContentStatisticsTopComment.ISummary>(
            topComment,
          );
          TestValidator.equals(
            `comments-only topComment[${index},${cIndex}] communityId matches community A`,
            topComment.communityId,
            communityA.id,
          );
          TestValidator.equals(
            `comments-only topComment[${index},${cIndex}] authorUserId matches author1`,
            topComment.authorUserId,
            author1Join.id,
          );
        },
      );
    },
  );

  // 3rd analytics call: same filters but sortBy createdAt asc
  const requestCommentsByCreatedAt = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    communityIds: [communityA.id as string & tags.Format<"uuid">],
    authorIds: [author1Join.id as string & tags.Format<"uuid">],
    contentTypes: ["comment"],
    minScore: undefined,
    maxScore: undefined,
    minVoteCount: undefined,
    createdFrom,
    createdTo,
    sortBy: "createdAt" as const,
    sortDirection: "asc" as const,
  } satisfies ICommunityPlatformKarmaByContentStatistics.IRequest;

  const commentsByCreatedAtPage =
    await api.functional.communityPlatform.adminUser.statistics.karma.byContent.index(
      connection,
      {
        body: requestCommentsByCreatedAt,
      },
    );
  typia.assert<IPageICommunityPlatformKarmaByContentStatistics.ISummary>(
    commentsByCreatedAtPage,
  );

  TestValidator.predicate(
    "comments-by-createdAt analytics returns non-negative record count",
    commentsByCreatedAtPage.pagination.records >= 0,
  );

  // Compare record counts to ensure consistent pagination footprint
  TestValidator.equals(
    "comments-only and comments-by-createdAt have same records count",
    commentsOnlyPage.pagination.records,
    commentsByCreatedAtPage.pagination.records,
  );

  // Sanity checks that both comment-focused queries remain scoped to community A + author1
  await ArrayUtil.asyncForEach(
    commentsByCreatedAtPage.data,
    async (summary, index) => {
      typia.assert<ICommunityPlatformKarmaByContentStatistics.ISummary>(
        summary,
      );
      await ArrayUtil.asyncForEach(
        summary.topComments,
        async (topComment, cIndex) => {
          typia.assert<ICommunityPlatformKarmaByContentStatisticsTopComment.ISummary>(
            topComment,
          );
          TestValidator.equals(
            `createdAt-sorted topComment[${index},${cIndex}] communityId matches community A`,
            topComment.communityId,
            communityA.id,
          );
          TestValidator.equals(
            `createdAt-sorted topComment[${index},${cIndex}] authorUserId matches author1`,
            topComment.authorUserId,
            author1Join.id,
          );
        },
      );
    },
  );

  // Tight filter example: page 1, limit 1, verify pagination records >= data length
  const tightRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    communityIds: [communityA.id as string & tags.Format<"uuid">],
    authorIds: [author1Join.id as string & tags.Format<"uuid">],
    contentTypes: ["comment"],
    minScore: undefined,
    maxScore: undefined,
    minVoteCount: undefined,
    createdFrom,
    createdTo,
    sortBy: "score" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformKarmaByContentStatistics.IRequest;

  const tightPage =
    await api.functional.communityPlatform.adminUser.statistics.karma.byContent.index(
      connection,
      {
        body: tightRequest,
      },
    );
  typia.assert<IPageICommunityPlatformKarmaByContentStatistics.ISummary>(
    tightPage,
  );

  TestValidator.predicate(
    "tight filter pagination.records >= data length",
    tightPage.pagination.records >= tightPage.data.length,
  );
}
