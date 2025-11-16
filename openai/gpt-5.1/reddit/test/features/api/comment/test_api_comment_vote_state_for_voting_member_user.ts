import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that a voting member user sees their own downvote reflected in the
 * aggregated comment voting state.
 *
 * Business context: A logged-in community member can post content, comment on
 * posts, and vote on comments. The platform exposes a read API that returns the
 * aggregate voting state for a given comment, including the caller's own vote
 * as `myVote`. This test ensures that when a member downvotes a comment, the
 * subsequent voting state read reflects:
 *
 * - Correct aggregation counters (upvotes/downvotes/score)
 * - The member's own vote direction in `myVote`.
 *
 * Steps:
 *
 * 1. Register a member user via /auth/memberUser/join.
 * 2. Create a community via /communityPlatform/memberUser/communities.
 * 3. Join the community via
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 4. Create a text post in that community via /communityPlatform/memberUser/posts.
 * 5. Create a top-level comment via
 *    /communityPlatform/memberUser/posts/{postId}/comments.
 * 6. As the same member, cast a downvote on the comment via
 *    /communityPlatform/memberUser/comments/{commentId}/votes with
 *    direction="down".
 * 7. Call PATCH /communityPlatform/comments/{commentId}/votes to fetch the voting
 *    state.
 *
 * Assertions:
 *
 * - Returned comment_id equals the created comment.id.
 * - Upvotes === 0, downvotes === 1, score === -1.
 * - MyVote === "down" for this caller.
 * - Response passes typia.assert<ICommunityPlatformCommentVote>().
 */
export async function test_api_comment_vote_state_for_voting_member_user(
  connection: api.IConnection,
) {
  // 1. Register a member user (auth join) to obtain an authenticated session
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorizedMember);

  // 2. Create a community owned by this member
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
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Join the community as a member
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

  // 4. Create a text post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create a top-level comment on the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 6. Cast a downvote on the comment as the same member user
  const voteCreateBody = {
    direction: "down",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const afterCreateVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(afterCreateVote);

  // Sanity-check that the immediate response reflects the new downvote
  TestValidator.equals(
    "immediate vote response comment id matches",
    afterCreateVote.comment_id,
    comment.id,
  );

  // 7. Read the aggregated voting state via PATCH /communityPlatform/comments/{commentId}/votes
  const aggregated: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.comments.votes.index(connection, {
      commentId: comment.id,
    });
  typia.assert<ICommunityPlatformCommentVote>(aggregated);

  // Assertions on aggregate
  TestValidator.equals(
    "aggregated comment id matches created comment",
    aggregated.comment_id,
    comment.id,
  );

  TestValidator.equals(
    "aggregated upvotes should be zero after single downvote",
    aggregated.upvotes,
    0,
  );

  TestValidator.equals(
    "aggregated downvotes should be one after single downvote",
    aggregated.downvotes,
    1,
  );

  TestValidator.equals(
    "aggregated score should be -1 after one downvote",
    aggregated.score,
    -1,
  );

  TestValidator.equals(
    "myVote should be 'down' for the authenticated member user",
    aggregated.myVote,
    "down",
  );
}
