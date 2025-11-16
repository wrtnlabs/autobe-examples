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

export async function test_api_karma_evolution_reflects_post_and_comment_activity_for_member(
  connection: api.IConnection,
) {
  // 1. Register the author member user (this user will author content).
  const authorJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const author: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: authorJoinInput,
    });
  typia.assert(author);

  // 2. Author creates a community.
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Author creates a membership in the community.
  const membershipCreateBodyForAuthor = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const authorMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBodyForAuthor,
      },
    );
  typia.assert(authorMembership);

  // Capture a starting timestamp just before content creation for analytics window.
  const fromTimestamp: string = new Date().toISOString();

  // 4. Author creates a post in that community.
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Author creates a comment on the post.
  const commentCreateBody = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. Register first voter (V1) and create membership.
  const voter1JoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const voter1: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: voter1JoinInput,
    });
  typia.assert(voter1);

  const membershipCreateBodyForV1 = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const voter1Membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBodyForV1,
      },
    );
  typia.assert(voter1Membership);

  // 7. V1 votes on the post and the comment.
  const postVoteBodyV1 = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVoteV1: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postVoteBodyV1,
      },
    );
  typia.assert(postVoteV1);

  const commentVoteBodyV1 = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVoteV1: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: commentVoteBodyV1,
      },
    );
  typia.assert(commentVoteV1);

  // 8. Register second voter (V2) and create membership.
  const voter2JoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const voter2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: voter2JoinInput,
    });
  typia.assert(voter2);

  const membershipCreateBodyForV2 = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const voter2Membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBodyForV2,
      },
    );
  typia.assert(voter2Membership);

  // 9. V2 votes on the post and the comment (post downvote, comment upvote).
  const postVoteBodyV2 = {
    direction: "down",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVoteV2: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postVoteBodyV2,
      },
    );
  typia.assert(postVoteV2);

  const commentVoteBodyV2 = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVoteV2: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: commentVoteBodyV2,
      },
    );
  typia.assert(commentVoteV2);

  // 10. Capture an end timestamp after all votes.
  const toTimestamp: string = new Date().toISOString();

  // 11. Call karma evolution analytics for the currently authenticated user (V2).
  const requestBody = {
    from: fromTimestamp,
    to: toTimestamp,
    bucket_granularity: "daily",
    community_id: community.id,
    content_scope: "all",
    page: 0,
    limit: 10,
  } satisfies ICommunityPlatformKarmaEvolution.IRequest;

  const page: IPageICommunityPlatformKarmaEvolution.ISummary =
    await api.functional.communityPlatform.memberUser.analytics.karma.evolution.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(page);

  // 12. Basic structural assertions on pagination and data.
  TestValidator.predicate(
    "karma evolution page should have at least one data item",
    page.data.length > 0,
  );

  await ArrayUtil.asyncForEach(page.data, async (summary) => {
    typia.assert(summary);
  });

  // 13. Locate a bucket belonging to the currently authenticated user (voter2).
  const targetSummary: ICommunityPlatformKarmaEvolution.ISummary | undefined =
    page.data.find((summary) => summary.member_user.id === voter2.id);

  TestValidator.predicate(
    "there should be at least one karma evolution bucket for the authenticated user",
    !!targetSummary,
  );

  if (!targetSummary) return;

  // 14. Validate basic invariants on the target summary.
  TestValidator.equals(
    "member_user in karma evolution summary should match authenticated user",
    targetSummary.member_user.id,
    voter2.id,
  );

  TestValidator.equals(
    "net_delta should equal posts_delta + comments_delta",
    targetSummary.net_delta,
    targetSummary.posts_delta + targetSummary.comments_delta,
  );

  TestValidator.predicate(
    "karma evolution net_delta should be non-zero after voting activity",
    targetSummary.net_delta !== 0,
  );

  TestValidator.predicate(
    "at least one of posts_delta or comments_delta should be non-zero",
    targetSummary.posts_delta !== 0 || targetSummary.comments_delta !== 0,
  );
}
