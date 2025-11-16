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
 * Validate public aggregated voting state for a comment after a member has
 * voted.
 *
 * Business context:
 *
 * - A registered member user can create communities, posts, comments, and cast
 *   votes.
 * - The system exposes a public endpoint to fetch aggregated voting state for a
 *   comment that should be accessible without authentication.
 * - Public callers must see aggregate counters but never a personalized myVote
 *   value.
 *
 * Steps:
 *
 * 1. Register a new member user (join) and obtain an authenticated session.
 * 2. As that member, create a community with text posting enabled.
 * 3. Join the created community as a regular member.
 * 4. Create a text post in that community.
 * 5. Create a top-level comment on that post.
 * 6. Cast an upvote on that comment as the authenticated member.
 * 7. Using an unauthenticated connection (no Authorization header), call the
 *    public comment votes endpoint to retrieve aggregated voting state.
 * 8. Assert that aggregate counters and identity fields match expectations and
 *    that the endpoint is read-only/idempotent.
 */
export async function test_api_comment_vote_state_public_access_after_member_interaction(
  connection: api.IConnection,
) {
  // 1. Register a new member user and authenticate
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community where text posts are allowed
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Join the community as a member
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
  typia.assert(membership);

  // 4. Create a text post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a top-level comment on that post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 6. Cast an upvote on the comment as the member user
  const voteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const memberVoteResult: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteBody,
      },
    );
  typia.assert(memberVoteResult);

  TestValidator.equals(
    "member vote aggregate matches comment",
    memberVoteResult.comment_id,
    comment.id,
  );

  // At least one upvote should be present after the member vote operation
  TestValidator.equals(
    "member vote upvotes should be 1",
    memberVoteResult.upvotes,
    1,
  );
  TestValidator.equals(
    "member vote downvotes should be 0",
    memberVoteResult.downvotes,
    0,
  );
  TestValidator.equals(
    "member vote score should equal 1 for a single upvote",
    memberVoteResult.score,
    1,
  );

  // 7. Prepare an unauthenticated connection (no Authorization header)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Publicly retrieve aggregated voting state for the comment
  const publicVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.comments.votes.index(
      publicConnection,
      { commentId: comment.id },
    );
  typia.assert(publicVote);

  // Validate identity linkage
  TestValidator.equals(
    "public vote comment_id should match comment.id",
    publicVote.comment_id,
    comment.id,
  );

  // Validate aggregate counters: 1 upvote, 0 downvotes, score 1
  TestValidator.equals(
    "public upvotes should be 1 after single member upvote",
    publicVote.upvotes,
    1,
  );
  TestValidator.equals(
    "public downvotes should be 0 after single member upvote",
    publicVote.downvotes,
    0,
  );
  TestValidator.equals(
    "public score should be 1 after single member upvote",
    publicVote.score,
    1,
  );

  // myVote must be null for unauthenticated caller
  TestValidator.equals(
    "public myVote must be null for unauthenticated caller",
    publicVote.myVote,
    null,
  );

  // Idempotency/read-only: repeated index calls should return same aggregate
  const publicVoteAgain: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.comments.votes.index(
      publicConnection,
      { commentId: comment.id },
    );
  typia.assert(publicVoteAgain);

  TestValidator.equals(
    "repeated public vote fetch should yield same aggregate state",
    publicVoteAgain,
    publicVote,
  );
}
