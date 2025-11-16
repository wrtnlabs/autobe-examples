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
 * Validate that aggregated comment votes reflect multiple member users' votes
 * and that myVote depends on the caller while aggregates stay stable.
 *
 * Steps:
 *
 * 1. Register memberUser A (join) and memberUser B (join).
 * 2. As A, create a community.
 * 3. As A, create A's membership in that community.
 * 4. As B, create B's membership in the same community.
 * 5. As A, create a post in the community.
 * 6. As A, create a comment on that post.
 * 7. As A, cast an upvote on the comment.
 * 8. As B, cast a downvote on the same comment.
 * 9. Fetch aggregated votes as A, as B, and as an unauthenticated guest and verify
 *    aggregates and myVote per caller.
 */
export async function test_api_comment_vote_aggregation_with_multiple_member_users(
  connection: api.IConnection,
) {
  // Helper to build a valid IJoin payload with fixed href/referrer.
  const buildJoinBody = (username: string, email: string, password: string) =>
    ({
      username,
      email,
      password,
      ip: null,
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    }) satisfies ICommunityPlatformMemberuser.IJoin;

  // 1. Register memberUser A
  const memberAUsername = RandomGenerator.name(1);
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const commonPassword = RandomGenerator.alphaNumeric(12);

  const authorizedA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: buildJoinBody(memberAUsername, memberAEmail, commonPassword),
    });
  typia.assert(authorizedA);

  // 2. Register memberUser B (this also switches connection to B)
  const memberBUsername = RandomGenerator.name(1);
  const memberBEmail = typia.random<string & tags.Format<"email">>();

  const authorizedB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: buildJoinBody(memberBUsername, memberBEmail, commonPassword),
    });
  typia.assert(authorizedB);

  // 3. Switch back to A by joining again with the same credentials
  const authorizedA2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: buildJoinBody(memberAUsername, memberAEmail, commonPassword),
    });
  typia.assert(authorizedA2);

  // 4. As A, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(16),
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. As A, create A's membership in the community
  const membershipABody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipABody,
      },
    );
  typia.assert(membershipA);

  // 6. Switch to B by joining again with B's credentials
  const authorizedB2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: buildJoinBody(memberBUsername, memberBEmail, commonPassword),
    });
  typia.assert(authorizedB2);

  // 7. As B, create B's membership in the same community
  const membershipBBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBBody,
      },
    );
  typia.assert(membershipB);

  // 8. Switch back to A for content creation
  const authorizedA3: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: buildJoinBody(memberAUsername, memberAEmail, commonPassword),
    });
  typia.assert(authorizedA3);

  // 9. As A, create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 10. As A, create a comment on that post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 11. As A, cast an upvote on the comment
  const voteUpBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const voteAfterA: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteUpBody,
      },
    );
  typia.assert(voteAfterA);

  // 12. Switch to B and cast a downvote on the same comment
  const authorizedB3: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: buildJoinBody(memberBUsername, memberBEmail, commonPassword),
    });
  typia.assert(authorizedB3);

  const voteDownBody = {
    direction: "down",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const voteAfterB: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteDownBody,
      },
    );
  typia.assert(voteAfterB);

  // 13. As B, read aggregated votes
  const aggAsB: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.comments.votes.at(connection, {
      commentId: comment.id,
    });
  typia.assert(aggAsB);

  TestValidator.equals(
    "aggregated votes after both votes - comment id",
    aggAsB.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "aggregated votes after both votes - upvotes",
    aggAsB.upvotes,
    1,
  );
  TestValidator.equals(
    "aggregated votes after both votes - downvotes",
    aggAsB.downvotes,
    1,
  );
  TestValidator.equals(
    "aggregated votes after both votes - score",
    aggAsB.score,
    0,
  );
  TestValidator.equals("myVote as memberUser B is down", aggAsB.myVote, "down");

  // 14. Switch to A and read aggregated votes
  const authorizedA4: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: buildJoinBody(memberAUsername, memberAEmail, commonPassword),
    });
  typia.assert(authorizedA4);

  const aggAsA: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.comments.votes.at(connection, {
      commentId: comment.id,
    });
  typia.assert(aggAsA);

  TestValidator.equals(
    "aggregated votes as A - comment id",
    aggAsA.comment_id,
    comment.id,
  );
  TestValidator.equals("aggregated votes as A - upvotes", aggAsA.upvotes, 1);
  TestValidator.equals(
    "aggregated votes as A - downvotes",
    aggAsA.downvotes,
    1,
  );
  TestValidator.equals("aggregated votes as A - score", aggAsA.score, 0);
  TestValidator.equals("myVote as memberUser A is up", aggAsA.myVote, "up");

  // 15. Call votes.at without authentication to ensure myVote is null while aggregates stay the same
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const aggAsGuest: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.comments.votes.at(guestConnection, {
      commentId: comment.id,
    });
  typia.assert(aggAsGuest);

  TestValidator.equals(
    "aggregated votes as guest - comment id",
    aggAsGuest.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "aggregated votes as guest - upvotes",
    aggAsGuest.upvotes,
    1,
  );
  TestValidator.equals(
    "aggregated votes as guest - downvotes",
    aggAsGuest.downvotes,
    1,
  );
  TestValidator.equals(
    "aggregated votes as guest - score",
    aggAsGuest.score,
    0,
  );
  TestValidator.equals("myVote as guest must be null", aggAsGuest.myVote, null);
}
