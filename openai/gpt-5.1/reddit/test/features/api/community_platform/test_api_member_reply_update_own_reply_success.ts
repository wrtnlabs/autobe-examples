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
 * Validate that a member user can update their own reply under a post comment.
 *
 * Business flow:
 *
 * 1. Register and authenticate a member user via auth.memberUser.join.
 * 2. Create a community that allows text posts.
 * 3. Create a membership for that user in the community with role "member" and
 *    approved/not banned flags.
 * 4. Create a text post in that community.
 * 5. Create a parent comment on the post.
 * 6. Create a reply under that comment.
 * 7. Update the reply body text via the target PUT endpoint.
 *
 * Validations:
 *
 * - Updated comment response is a valid ICommunityPlatformComment.
 * - Id remains the same as the original reply id.
 * - Post and parent relationships are unchanged.
 * - Body is updated to the new content.
 * - Status and is_locked remain unchanged.
 * - Created_at is unchanged; updated_at is greater than created_at.
 */
export async function test_api_member_reply_update_own_reply_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create community allowing text posts
  const communitySlug = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: false,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create community membership for the user
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

  TestValidator.equals(
    "membership community id matches created community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member id matches authorized member",
    membership.memberUser.id,
    member.id,
  );

  // 4. Create a text post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id matches community",
    post.community_id,
    community.id,
  );

  // 5. Create a parent comment on the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 5 }),
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

  TestValidator.equals(
    "comment post id matches post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment parent_comment_id is null for top-level comment",
    comment.parent_comment_id ?? null,
    null,
  );

  // 6. Create a reply under that comment
  const originalReplyBodyText = RandomGenerator.paragraph({ sentences: 4 });
  const replyCreateBody = {
    body: originalReplyBodyText,
    format: "plain" as const,
    replyContext: undefined,
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        commentId: comment.id as string & tags.Format<"uuid">,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);

  TestValidator.equals("reply post id matches post", reply.post.id, post.id);
  TestValidator.equals(
    "reply parent comment id matches parent comment",
    reply.parent_comment.id,
    comment.id,
  );

  // 7. Update the reply body text via the target PUT endpoint
  const newReplyBodyText = RandomGenerator.paragraph({ sentences: 6 });

  const updateBody = {
    body: newReplyBodyText,
  } satisfies ICommunityPlatformComment.IUpdate;

  const updated: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.update(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        commentId: comment.id as string & tags.Format<"uuid">,
        replyId: reply.id as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Validate id and relationships
  TestValidator.equals(
    "updated comment id matches original reply id",
    updated.id,
    reply.id,
  );
  TestValidator.equals(
    "updated comment post id matches original post",
    updated.post.id,
    post.id,
  );
  TestValidator.equals(
    "updated comment parent_comment_id matches parent comment id",
    updated.parent_comment_id ?? null,
    comment.id,
  );

  // Validate body changed
  TestValidator.notEquals(
    "updated comment body differs from original reply content",
    updated.body,
    originalReplyBodyText,
  );
  TestValidator.equals(
    "updated comment body matches new content",
    updated.body,
    newReplyBodyText,
  );

  // status and is_locked should remain consistent with pre-update reply state
  TestValidator.equals(
    "status unchanged between reply and updated comment",
    updated.status,
    reply.status,
  );
  TestValidator.equals(
    "is_locked unchanged between reply and updated comment",
    updated.is_locked,
    reply.is_locked,
  );

  // created_at unchanged, updated_at greater than created_at
  TestValidator.equals(
    "created_at unchanged between reply and updated comment",
    updated.created_at,
    reply.created_at,
  );
  TestValidator.predicate(
    "updated_at is greater than created_at on updated comment",
    new Date(updated.updated_at).getTime() >
      new Date(updated.created_at).getTime(),
  );
}
