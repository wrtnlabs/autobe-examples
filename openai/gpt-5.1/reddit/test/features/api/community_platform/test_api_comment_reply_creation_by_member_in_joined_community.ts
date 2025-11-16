import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReply";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that a joined community member can create a reply on a comment in a
 * post, and that the created reply is correctly wired to its post, parent
 * comment, and author.
 *
 * Business workflow
 *
 * 1. Register a new member user (auth.memberUser.join), obtaining an authenticated
 *    context.
 * 2. Create a community as that member.
 * 3. Join the created community as a normal approved, non-banned member.
 * 4. Create a post in that community.
 * 5. Create a top-level comment on that post.
 * 6. Create a reply to that comment.
 *
 * Validations
 *
 * - All intermediate entities (member, community, membership, post, comment,
 *   reply) conform to their DTOs.
 * - Membership community and memberUser summaries match the created entities.
 * - Post community/author identifiers match the created community/member.
 * - Comment is a top-level comment for the post.
 * - Reply is linked to the correct post and parent comment, authored by the
 *   joined member.
 * - Reply status flags reflect a visible, non-deleted, unlocked reply with
 *   non-negative initial score.
 */
export async function test_api_comment_reply_creation_by_member_in_joined_community(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as that member
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
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a community membership for this member
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

  // Validate membership relationships
  TestValidator.equals(
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership member id matches authorized member",
    membership.memberUser.id,
    memberAuthorized.id,
  );

  // 4. Create a post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community_id matches created community",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author_memberuser_id matches authorized member",
    post.author_memberuser_id,
    memberAuthorized.id,
  );

  // 5. Create a top-level comment on the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
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

  TestValidator.equals(
    "comment post summary id matches post id",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "top-level comment has no parent_comment_id",
    comment.parent_comment_id ?? null,
    null,
  );

  // 6. Create a reply to the comment
  const replyBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    format: "markdown",
    replyContext: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  // Linkage validations
  TestValidator.equals(
    "reply post summary id matches post id",
    reply.post.id,
    post.id,
  );
  TestValidator.equals(
    "reply parent_comment summary id matches parent comment id",
    reply.parent_comment.id,
    comment.id,
  );
  TestValidator.equals(
    "reply author id matches authorized member",
    reply.author.id,
    memberAuthorized.id,
  );

  // Status and score validations for a new reply
  TestValidator.predicate(
    "reply is not marked as deleted",
    reply.is_deleted === false,
  );
  TestValidator.predicate(
    "reply is not locked on creation",
    reply.is_locked === false,
  );
  TestValidator.predicate(
    "reply score is non-negative on creation",
    reply.score >= 0,
  );
}
