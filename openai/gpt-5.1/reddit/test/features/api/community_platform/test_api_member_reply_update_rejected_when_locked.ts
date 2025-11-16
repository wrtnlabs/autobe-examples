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
 * Verify that reply updates are rejected once the reply has been locked.
 *
 * Business context: A member user participates in a community by creating a
 * post, adding a comment, and then replying to that comment. The reply can be
 * edited using the reply update endpoint, and the same endpoint exposes an
 * `is_locked` flag that controls whether further interactions are allowed. Once
 * a reply is locked, business rules should prevent additional content edits.
 *
 * Scenario steps:
 *
 * 1. Join as a memberUser (registration + authenticated session).
 * 2. Create a community as that memberUser.
 * 3. Create a membership for the memberUser in the community.
 * 4. Create a post in the community.
 * 5. Create a parent (top-level) comment on the post.
 * 6. Create a reply under that parent comment.
 * 7. First update: change the reply body and set `is_locked` to true using the
 *    reply update endpoint; expect success and `is_locked === true`.
 * 8. Second update: attempt to change the reply body again (omit `is_locked` so
 *    the lock state is unchanged); expect the API to throw, indicating locked
 *    replies cannot be edited.
 *
 * Validations:
 *
 * - All successful responses are structurally validated using `typia.assert`.
 * - After the first update, the reply body differs from the original and
 *   `is_locked` is true.
 * - A second update attempt on the locked reply fails via `TestValidator.error`,
 *   proving that the lock prevents further modification.
 */
export async function test_api_member_reply_update_rejected_when_locked(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser; SDK sets Authorization header.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 2. Create a community with posting enabled.
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
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

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a membership in the community for the current member user.
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create a post in the community.
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

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postBody,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create a parent comment under the post.
  const parentCommentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(parentComment);

  // 6. Create a reply under that parent comment.
  const initialReplyBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    format: "plain" as const,
    replyContext: undefined,
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: initialReplyBody,
      },
    );
  typia.assert<ICommunityPlatformCommentReply>(reply);

  // 7. First update: change body and lock the reply.
  const lockedBodyText = RandomGenerator.paragraph({ sentences: 2 });
  const firstUpdateBody = {
    body: lockedBodyText,
    status: undefined,
    is_locked: true,
  } satisfies ICommunityPlatformComment.IUpdate;

  const lockedReply1 =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.update(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        replyId: reply.id,
        body: firstUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(lockedReply1);

  // Validate first update effects.
  TestValidator.equals(
    "reply should be locked after first update",
    lockedReply1.is_locked,
    true,
  );

  TestValidator.notEquals(
    "reply body should change on first update",
    lockedReply1.body,
    reply.content,
  );

  TestValidator.equals(
    "created_at should remain unchanged after first update",
    lockedReply1.created_at,
    reply.created_at,
  );

  // 8. Second update attempt: try to edit locked reply; expect an error.
  const secondUpdateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    status: undefined,
    is_locked: undefined,
  } satisfies ICommunityPlatformComment.IUpdate;

  await TestValidator.error("updating a locked reply should fail", async () => {
    await api.functional.communityPlatform.memberUser.posts.comments.replies.update(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        replyId: reply.id,
        body: secondUpdateBody,
      },
    );
  });
}
