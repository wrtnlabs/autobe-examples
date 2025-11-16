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
 * Ensure that comment vote deletion is ownership-enforced.
 *
 * Business goal: Validate that a member user (Member B) cannot delete another
 * member user’s (Member A’s) vote on a comment. The DELETE
 * /communityPlatform/memberUser/comments/{commentId}/votes/{voteId} endpoint
 * must enforce that the targeted vote belongs to the authenticated member.
 *
 * High-level flow:
 *
 * 1. Member A joins the platform (auth.memberUser.join), obtaining an
 *    authenticated memberUser context.
 * 2. Member A creates a community
 *    (communityPlatform.memberUser.communities.create).
 * 3. Member A joins that community
 *    (communityPlatform.memberUser.communities.memberships.create).
 * 4. Member A creates a post in the community
 *    (communityPlatform.memberUser.posts.create).
 * 5. Member A creates a comment under that post
 *    (communityPlatform.memberUser.posts.comments.create).
 * 6. Member A casts a vote on the comment
 *    (communityPlatform.memberUser.comments.votes.create).
 * 7. Member B joins the platform via a second join call, switching the
 *    authenticated context on the shared connection.
 * 8. As Member B, attempt to delete the vote using
 *    communityPlatform.memberUser.comments.votes.erase.
 * 9. Assert that the delete attempt fails for Member B, proving that the endpoint
 *    enforces ownership-based authorization.
 */
export async function test_api_comment_vote_delete_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Member A joins (creates account and session)
  const memberAJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberA);

  // 2. Member A creates a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
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

  // 3. Member A joins the community
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

  // 4. Member A creates a post
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Member A creates a comment on the post
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

  // 6. Member A casts a vote on the comment
  const initialVoteCreateBody = {
    direction: RandomGenerator.pick(["up", "down"] as const),
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const initialVoteState: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: initialVoteCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(initialVoteState);

  // 7. Member B joins (switches authenticated context)
  const memberBJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberB);

  // 8. As Member B, attempt to delete Member A's vote.
  // We do not have a concrete voteId in the exposed DTOs, so we use a
  // random UUID-shaped value to represent a target vote identifier.
  const fakeVoteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "member B cannot erase member A's comment vote",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.votes.erase(
        connection,
        {
          commentId: comment.id,
          voteId: fakeVoteId,
        },
      );
    },
  );
}
