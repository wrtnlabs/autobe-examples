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
 * Validate idempotent behavior when updating a comment vote direction to the
 * same value.
 *
 * Business goals:
 *
 * - Ensure that a member user can upvote a comment, then call the vote update
 *   endpoint with the same direction ("up") one or more times without changing
 *   the aggregated vote counts or the caller's own vote state.
 * - Confirm that aggregates (upvotes, downvotes, score) and myVote remain stable
 *   across repeated PUT calls that do not change the direction.
 *
 * Scenario steps:
 *
 * 1. Register a memberUser (join) to obtain an authenticated context.
 * 2. Create a community.
 * 3. Create a membership for the memberUser in that community.
 * 4. Create a post in that community.
 * 5. Create a comment on the post.
 * 6. Cast an initial upvote on the comment via POST
 *    /communityPlatform/memberUser/comments/{commentId}/votes.
 * 7. Capture the returned aggregate voting state and assert that it reflects a
 *    single upvote from this user (upvotes=1, downvotes=0, score=1,
 *    myVote="up").
 * 8. Call PUT /communityPlatform/memberUser/comments/{commentId}/votes/{voteId}
 *    with direction still "up" and capture the aggregates.
 * 9. Repeat the PUT with the same direction "up" again.
 * 10. Validate across all three states (after POST, after 1st PUT, after 2nd PUT)
 *     that aggregates are unchanged and myVote remains "up", demonstrating
 *     idempotent behavior for same-direction updates in terms of observable
 *     state.
 */
export async function test_api_comment_vote_update_direction_toggle_behavior(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain an authorized context.
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a community as this memberUser.
  const communitySlug: string = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
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
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "created community slug should match requested slug",
    community.slug,
    communitySlug,
  );

  // 3. Create a membership for the memberUser in that community.
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

  TestValidator.equals(
    "membership community slug should match community slug",
    membership.community.slug,
    community.slug,
  );

  // 4. Create a post in the community.
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

  TestValidator.equals(
    "post community_id should match community.id",
    post.community_id,
    community.id,
  );

  // 5. Create a comment on the post.
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  TestValidator.equals(
    "comment post id should match created post id",
    comment.post.id,
    post.id,
  );

  // 6. Cast an initial upvote on the comment.
  const initialVoteBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const initialAggregate: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: initialVoteBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(initialAggregate);

  TestValidator.equals(
    "initial vote aggregate comment_id should match comment.id",
    initialAggregate.comment_id,
    comment.id,
  );

  // Baseline aggregates after initial upvote.
  const upvotes0 = initialAggregate.upvotes;
  const downvotes0 = initialAggregate.downvotes;
  const score0 = initialAggregate.score;
  const myVote0 = initialAggregate.myVote;

  TestValidator.equals(
    "initial upvotes should be 1 for a single upvote",
    upvotes0,
    1,
  );
  TestValidator.equals("initial downvotes should be 0", downvotes0, 0);
  TestValidator.equals("initial score should be 1", score0, 1);
  TestValidator.equals(
    "myVote after initial upvote should be 'up'",
    myVote0,
    "up",
  );

  // 7. Perform PUT update with the same direction "up".
  const voteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const updateBody1 = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.IUpdate;

  const aggregate1: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.update(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        voteId,
        body: updateBody1,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(aggregate1);

  TestValidator.equals(
    "aggregate1 comment_id should remain equal to comment.id",
    aggregate1.comment_id,
    comment.id,
  );

  const upvotes1 = aggregate1.upvotes;
  const downvotes1 = aggregate1.downvotes;
  const score1 = aggregate1.score;
  const myVote1 = aggregate1.myVote;

  TestValidator.equals(
    "upvotes should remain stable after first same-direction update",
    upvotes1,
    upvotes0,
  );
  TestValidator.equals(
    "downvotes should remain stable after first same-direction update",
    downvotes1,
    downvotes0,
  );
  TestValidator.equals(
    "score should remain stable after first same-direction update",
    score1,
    score0,
  );
  TestValidator.equals(
    "myVote should remain 'up' after first same-direction update",
    myVote1,
    myVote0,
  );

  // 8. Perform a second PUT update with direction "up" to verify idempotency further.
  const updateBody2 = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.IUpdate;

  const aggregate2: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.update(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        voteId,
        body: updateBody2,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(aggregate2);

  TestValidator.equals(
    "aggregate2 comment_id should remain equal to comment.id",
    aggregate2.comment_id,
    comment.id,
  );

  const upvotes2 = aggregate2.upvotes;
  const downvotes2 = aggregate2.downvotes;
  const score2 = aggregate2.score;
  const myVote2 = aggregate2.myVote;

  TestValidator.equals(
    "upvotes should remain stable after second same-direction update",
    upvotes2,
    upvotes1,
  );
  TestValidator.equals(
    "downvotes should remain stable after second same-direction update",
    downvotes2,
    downvotes1,
  );
  TestValidator.equals(
    "score should remain stable after second same-direction update",
    score2,
    score1,
  );
  TestValidator.equals(
    "myVote should remain 'up' after second same-direction update",
    myVote2,
    myVote1,
  );

  await TestValidator.predicate("final myVote should be 'up'", () =>
    Promise.resolve(myVote2 === "up"),
  );
}
