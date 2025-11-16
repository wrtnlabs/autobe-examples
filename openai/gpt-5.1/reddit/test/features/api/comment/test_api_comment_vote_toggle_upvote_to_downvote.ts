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
 * Validate toggling a member user's vote on a comment from up to down.
 *
 * Business context: A community platform member user can vote on comments. The
 * vote endpoint behaves like an upsert keyed by (memberUser, comment): calling
 * it with a new direction should update the user’s existing vote and the
 * aggregate counters for that comment. This test verifies that switching from
 * an upvote to a downvote results in aggregate counts that reflect a single
 * effective vote and a caller-specific myVote field that tracks the latest
 * direction.
 *
 * Steps:
 *
 * 1. Register a member user (join) to obtain an authenticated memberUser.
 * 2. Create a community as that memberUser.
 * 3. Create a membership for that user in the community with role "member".
 * 4. Create a post in that community.
 * 5. Create a top-level comment on the post.
 * 6. Cast an upvote on the comment.
 * 7. Toggle the same vote to downvote.
 * 8. Assert the aggregate states and myVote values for both calls.
 */
export async function test_api_comment_vote_toggle_upvote_to_downvote(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain an authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberUser);

  // 2. Create a community as that memberUser
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
  typia.assert(community);

  // 3. Create a membership for that user in the community
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

  // Sanity: membership community and memberUser summaries match created entities
  TestValidator.equals(
    "membership community slug matches",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership memberUser id matches join",
    membership.memberUser.id,
    memberUser.id,
  );

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

  // Sanity: post should reference the same community
  TestValidator.equals(
    "post community id matches",
    post.community_id,
    community.id,
  );

  // 5. Create a top-level comment on the post
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

  // Sanity: comment belongs to the expected post
  TestValidator.equals("comment post id matches", comment.post.id, post.id);

  // 6. Cast an upvote on the comment
  const upvoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const upvoteResult: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: upvoteBody,
      },
    );
  typia.assert(upvoteResult);

  // Basic invariants for upvote aggregate
  TestValidator.equals(
    "upvote comment_id matches comment.id",
    upvoteResult.comment_id,
    comment.id,
  );
  TestValidator.predicate(
    "upvote: upvotes should be at least 1",
    upvoteResult.upvotes >= 1,
  );
  TestValidator.equals(
    "upvote: downvotes should be zero",
    upvoteResult.downvotes,
    0,
  );
  TestValidator.predicate(
    "upvote: score should be positive or zero",
    upvoteResult.score >= 1,
  );
  TestValidator.equals("upvote: myVote is 'up'", upvoteResult.myVote, "up");
  TestValidator.predicate(
    "upvote: only one side of votes is non-zero",
    !(upvoteResult.upvotes > 0 && upvoteResult.downvotes > 0),
  );

  // 7. Toggle the vote to downvote
  const downvoteBody = {
    direction: "down",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const downvoteResult: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: downvoteBody,
      },
    );
  typia.assert(downvoteResult);

  // Invariants after toggling to downvote
  TestValidator.equals(
    "downvote: comment_id matches comment.id",
    downvoteResult.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "downvote: comment_id remains consistent with first result",
    downvoteResult.comment_id,
    upvoteResult.comment_id,
  );
  TestValidator.equals(
    "downvote: upvotes should be zero",
    downvoteResult.upvotes,
    0,
  );
  TestValidator.predicate(
    "downvote: downvotes should be at least 1",
    downvoteResult.downvotes >= 1,
  );
  TestValidator.predicate(
    "downvote: score should be negative or zero",
    downvoteResult.score <= -1,
  );
  TestValidator.equals(
    "downvote: myVote is 'down'",
    downvoteResult.myVote,
    "down",
  );
  TestValidator.predicate(
    "downvote: only one side of votes is non-zero",
    !(downvoteResult.upvotes > 0 && downvoteResult.downvotes > 0),
  );
}
