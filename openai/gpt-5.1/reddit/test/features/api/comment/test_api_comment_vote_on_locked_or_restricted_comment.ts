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
 * Validate comment voting aggregates for a member user, including creating the
 * full community/post/comment context and verifying that repeated votes from
 * the same member update aggregate state consistently.
 *
 * Business flow (adapted to available APIs):
 *
 * 1. Register a community platform member user, obtaining an authenticated
 *    memberUser context via /auth/memberUser/join.
 * 2. Create a community via /communityPlatform/memberUser/communities.
 * 3. Create a membership for that user in the community via
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 4. Create a text post in the community via /communityPlatform/memberUser/posts.
 * 5. Create a comment on that post via
 *    /communityPlatform/memberUser/posts/{postId}/comments.
 * 6. Cast an "up" vote on the comment via
 *    /communityPlatform/memberUser/comments/{commentId}/votes and validate the
 *    returned aggregate (upvotes, downvotes, score, myVote).
 * 7. Cast a subsequent "down" vote from the same member on the same comment and
 *    validate that aggregates and myVote are updated accordingly.
 *
 * The original scenario requested testing that voting is blocked on locked or
 * restricted comments and that reading aggregated state via a PATCH read
 * endpoint remains possible. However, the provided SDK exposes only a POST
 * create/update endpoint for comment votes and no APIs to toggle lock or
 * restriction state. Therefore, this test focuses on the core business behavior
 * that is implementable: consistent aggregation of votes for a comment from a
 * single authenticated member user.
 */
export async function test_api_comment_vote_on_locked_or_restricted_comment(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authenticated session
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a membership in the community for the current member user
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create a text post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
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
  typia.assert<ICommunityPlatformComment>(comment);

  // 6. First vote: up
  const firstVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const firstAggregate: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: firstVoteBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(firstAggregate);

  // Basic aggregate expectations after first upvote
  TestValidator.equals(
    "first vote comment_id should match comment.id",
    firstAggregate.comment_id,
    comment.id,
  );
  TestValidator.predicate(
    "first vote upvotes should be non-negative",
    firstAggregate.upvotes >= 0,
  );
  TestValidator.predicate(
    "first vote downvotes should be non-negative",
    firstAggregate.downvotes >= 0,
  );
  TestValidator.equals(
    "first vote myVote should be 'up'",
    firstAggregate.myVote,
    "up",
  );

  // 7. Second vote: change direction to down from same user
  const secondVoteBody = {
    direction: "down",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const secondAggregate: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: secondVoteBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(secondAggregate);

  // Validate that the aggregate now reflects a "down" vote
  TestValidator.equals(
    "second vote comment_id should still match comment.id",
    secondAggregate.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "second vote myVote should be 'down'",
    secondAggregate.myVote,
    "down",
  );

  // Ensure that the score or vote counts changed between first and second vote
  TestValidator.notEquals(
    "score should change after switching vote direction",
    firstAggregate.score,
    secondAggregate.score,
  );
}
