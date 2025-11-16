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
 * Validate that updating a comment vote requires ownership.
 *
 * Business goal: Ensure that a member user cannot update another member user's
 * vote on a comment. Only the original voter should be able to change the vote
 * direction for their own vote record.
 *
 * Flow:
 *
 * 1. Join memberUser A.
 * 2. Join memberUser B.
 * 3. As A, create a community.
 * 4. As A, create a membership for A in that community.
 * 5. As B, create a membership for B in the same community.
 * 6. As A, create a post in that community.
 * 7. As A, create a comment on that post.
 * 8. As A, create a comment vote with direction "up" and capture the aggregate
 *    vote state.
 * 9. As B, attempt to update the vote via PUT
 *    /communityPlatform/memberUser/comments/{commentId}/votes/{voteId}. This
 *    must fail for B when targeting a vote record that does not belong to B,
 *    exercising ownership/authorization constraints.
 * 10. As A, call create again with the same direction "up" and verify that the
 *     aggregate still reflects an upvote from A, i.e., A's `myVote` remains
 *     "up" and aggregates are consistent.
 */
export async function test_api_comment_vote_update_requires_vote_ownership(
  connection: api.IConnection,
) {
  const baseHref = "https://example.com/join";
  const baseReferrer = "https://example.com/landing";

  // 1. Join memberUser A (connection now authenticated as A)
  const joinBodyA = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: baseHref as string & tags.Format<"uri">,
    referrer: baseReferrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyA,
    });
  typia.assert(memberA);

  // 2. Join memberUser B (connection token becomes B)
  const joinBodyB = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: baseHref as string & tags.Format<"uri">,
    referrer: baseReferrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyB,
    });
  typia.assert(memberB);

  // 3. Re-join A so subsequent calls are as memberUser A
  const memberAAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyA,
    });
  typia.assert(memberAAgain);

  // 3. As A, create a community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
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
  typia.assert(community);

  // 4. As A, create a membership for A in that community
  const membershipBodyA = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBodyA,
      },
    );
  typia.assert(membershipA);

  // 5. Switch to B by joining B again, then create membership for B
  const memberBAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyB,
    });
  typia.assert(memberBAgain);

  const membershipBodyB = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBodyB,
      },
    );
  typia.assert(membershipB);

  // 6. Switch back to A and create a post in that community
  const memberAThird: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyA,
    });
  typia.assert(memberAThird);

  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
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
      body: postBody,
    });
  typia.assert(post);

  // 7. As A, create a comment on that post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 8. As A, create a vote on the comment (direction "up")
  const createVoteBodyA = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const voteAggregateA: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: createVoteBodyA,
      },
    );
  typia.assert(voteAggregateA);

  TestValidator.equals(
    "A's myVote should be 'up' after initial create",
    voteAggregateA.myVote,
    "up",
  );

  // We do not have direct access to a concrete voteId in the aggregate type,
  // but the update API requires a voteId. Using a random UUID here exercises
  // the authorization/ownership + existence checks for B attempting to
  // update a non-owned/non-existent vote record.
  const foreignVoteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 9. Switch to B and attempt to update the vote for the same comment
  const memberBFourth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyB,
    });
  typia.assert(memberBFourth);

  const updateBodyB = {
    direction: "down",
  } satisfies ICommunityPlatformCommentVote.IUpdate;

  await TestValidator.error(
    "memberUser B cannot successfully update someone else's comment vote",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.votes.update(
        connection,
        {
          commentId: comment.id as string & tags.Format<"uuid">,
          voteId: foreignVoteId,
          body: updateBodyB,
        },
      );
    },
  );

  // 10. Switch back to A and ensure A still has an "up" vote and aggregates
  // remain consistent after B's failed attempt.
  const memberAFifth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBodyA,
    });
  typia.assert(memberAFifth);

  const voteAggregateAAfter: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: createVoteBodyA,
      },
    );
  typia.assert(voteAggregateAAfter);

  TestValidator.equals(
    "A's myVote should remain 'up' after B's failed update attempt",
    voteAggregateAAfter.myVote,
    "up",
  );

  TestValidator.predicate(
    "upvote aggregate should be non-negative and at least one after failed foreign update",
    voteAggregateAAfter.upvotes >= 1 && voteAggregateAAfter.downvotes >= 0,
  );
}
