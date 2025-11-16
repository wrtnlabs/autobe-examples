import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformKarmaEvolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaEvolution";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaEvolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaEvolution";

export async function test_api_karma_evolution_respects_content_scope_filters(
  connection: api.IConnection,
) {
  // 1. Join as a single member user (authorU), who will act as author and voter
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const author: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(author);

  // 2. Create a community as this member user
  const communityBody = {
    slug: `community-${RandomGenerator.alphabets(8)}`,
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
  typia.assert(community);

  // 3. Create a membership for the author in the created community
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
  typia.assert(membership);

  // 4. Create a post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a comment on that post
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
  typia.assert(comment);

  // 6. Cast a vote on the post (post-related karma)
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
  typia.assert(postVote);

  // 7. Cast a vote on the comment (comment-related karma)
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
  typia.assert(commentVote);

  // 8. Prepare time window covering all activity
  const now = new Date();
  const from = new Date(now.getTime() - 60_000).toISOString();
  const to = new Date(now.getTime() + 60_000).toISOString();

  // Helper to call analytics with a specific content_scope
  const callAnalytics = async (contentScope: string) => {
    const body = {
      from,
      to,
      bucket_granularity: "daily",
      community_id: community.id,
      content_scope: contentScope,
      page: 0 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
    } satisfies ICommunityPlatformKarmaEvolution.IRequest;

    const page: IPageICommunityPlatformKarmaEvolution.ISummary =
      await api.functional.communityPlatform.memberUser.analytics.karma.evolution.index(
        connection,
        { body },
      );
    typia.assert(page);
    return page;
  };

  // 9. Post-only analytics
  const postOnlyPage = await callAnalytics("post");
  const postOnlyData = postOnlyPage.data;

  TestValidator.predicate(
    "post-only analytics should return at least one bucket",
    postOnlyData.length > 0,
  );

  const postOnlyHasPostDelta = postOnlyData.some((s) => s.posts_delta !== 0);
  TestValidator.predicate(
    "post-only analytics should have non-zero posts_delta in at least one bucket",
    postOnlyHasPostDelta,
  );

  const postOnlyAllCommentsZero = postOnlyData.every(
    (s) => s.comments_delta === 0,
  );
  TestValidator.predicate(
    "post-only analytics should have zero comments_delta in all buckets",
    postOnlyAllCommentsZero,
  );

  // 10. Comment-only analytics
  const commentOnlyPage = await callAnalytics("comment");
  const commentOnlyData = commentOnlyPage.data;

  TestValidator.predicate(
    "comment-only analytics should return at least one bucket",
    commentOnlyData.length > 0,
  );

  const commentOnlyHasCommentDelta = commentOnlyData.some(
    (s) => s.comments_delta !== 0,
  );
  TestValidator.predicate(
    "comment-only analytics should have non-zero comments_delta in at least one bucket",
    commentOnlyHasCommentDelta,
  );

  const commentOnlyAllPostsZero = commentOnlyData.every(
    (s) => s.posts_delta === 0,
  );
  TestValidator.predicate(
    "comment-only analytics should have zero posts_delta in all buckets",
    commentOnlyAllPostsZero,
  );

  // 11. All-scope analytics
  const allScopePage = await callAnalytics("all");
  const allScopeData = allScopePage.data;

  TestValidator.predicate(
    "all-scope analytics should return at least one bucket",
    allScopeData.length > 0,
  );

  const allHasPostDelta = allScopeData.some((s) => s.posts_delta !== 0);
  const allHasCommentDelta = allScopeData.some((s) => s.comments_delta !== 0);

  TestValidator.predicate(
    "all-scope analytics should have non-zero posts_delta in at least one bucket",
    allHasPostDelta,
  );
  TestValidator.predicate(
    "all-scope analytics should have non-zero comments_delta in at least one bucket",
    allHasCommentDelta,
  );

  // For each bucket, net_delta should equal posts_delta + comments_delta
  for (const summary of allScopeData) {
    const expectedNet = summary.posts_delta + summary.comments_delta;
    TestValidator.equals(
      "net_delta should equal posts_delta + comments_delta in all-scope analytics",
      summary.net_delta,
      expectedNet,
    );
  }
}
