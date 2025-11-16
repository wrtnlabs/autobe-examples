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
 * Ensure that only the author of a reply can delete it via the memberUser
 * reply-delete endpoint.
 *
 * Business goal:
 *
 * - Validate that a non-author member, even with valid community membership,
 *   cannot delete another member’s reply using DELETE
 *   /communityPlatform/memberUser/posts/{postId}/comments/{commentId}/replies/{replyId}.
 *
 * High-level flow:
 *
 * 1. Register Author A (memberUser join) – SDK automatically attaches token to
 *    connection.
 * 2. As Author A, create a community via memberUser communities.create.
 * 3. As Author A, create a membership in that community (Author A is a community
 *    member).
 * 4. As Author A, create a post in that community via posts.create.
 * 5. As Author A, create a parent comment under that post via
 *    posts.comments.create.
 * 6. As Author A, create a reply under that comment via
 *    posts.comments.replies.create.
 * 7. Register Member B via a separate memberUser join call – token in connection
 *    is now for Member B.
 * 8. As Member B, join the same community via communities.memberships.create.
 * 9. As Member B, attempt to delete Author A’s reply via
 *    posts.comments.replies.erase and assert it fails.
 *
 * Constraints & notes:
 *
 * - We must not test specific HTTP status codes; simply assert that an error is
 *   thrown.
 * - We cannot call any non-provided GET/list endpoints for replies, so we focus
 *   on the forbidden behavior for non-author.
 * - All request bodies must exactly satisfy their DTO ICreate shapes using
 *   `satisfies` and correct field names.
 * - Authentication is handled by the SDK via connection headers; we only switch
 *   actors by calling join again.
 */
export async function test_api_member_reply_delete_forbidden_for_non_author(
  connection: api.IConnection,
) {
  // 1. Author A joins as a member user
  const authorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const author: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: authorJoinBody,
    });
  typia.assert(author);

  // 2. Author A creates a community
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
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Author A joins the community
  const authorMembershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const authorMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: authorMembershipBody,
      },
    );
  typia.assert(authorMembership);

  // 4. Author A creates a post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Author A creates a parent comment on the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 6. Author A creates a reply under that comment
  const replyBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    format: "plain",
    replyContext: undefined,
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

  // 7. Member B joins as a separate member user
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 8. Member B joins the same community
  const memberBMembershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const memberBMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: memberBMembershipBody,
      },
    );
  typia.assert(memberBMembership);

  // 9. As Member B, attempt to delete Author A's reply and assert it fails
  await TestValidator.error(
    "non-author member cannot delete another member's reply",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.replies.erase(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
          replyId: reply.id,
        },
      );
    },
  );
}
