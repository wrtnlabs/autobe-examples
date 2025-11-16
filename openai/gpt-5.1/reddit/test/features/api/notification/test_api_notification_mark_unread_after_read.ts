import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotification";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Verify that a member user can mark an existing notification as unread, and
 * that doing so is idempotent while preserving the notification's identity
 * fields.
 *
 * Business context:
 *
 * - Notifications are created (typically by admin or backend services) against
 *   concrete domain events (e.g., a new comment).
 * - A member user should be able to mark a notification as unread again if they
 *   want to revisit it later.
 * - Marking as unread must only affect read-state metadata, not the immutable
 *   identity of the notification.
 *
 * Steps:
 *
 * 1. Create a memberUser via join and keep their authentication context.
 * 2. As that memberUser, create a community.
 * 3. Join that community (membership create) as the same memberUser.
 * 4. Create a post in that community as the same memberUser.
 * 5. Create a comment on that post as the same memberUser.
 * 6. Create an adminUser via join and authenticate as adminUser.
 * 7. As adminUser, create a notification targeting the memberUser and pointing to
 *    the created comment via target_type/target_id, with an initial unread
 *    state.
 * 8. Switch back to memberUser authentication.
 * 9. Call markUnread for the created notification id.
 * 10. Validate that:
 *
 *     - The notification is returned as unread (is_read === false).
 *     - Read_at is cleared (null or undefined).
 *     - Core identity fields (id, category, title, body, target_type, target_id,
 *           created_at) are preserved.
 * 11. Call markUnread again on the same notification id and confirm idempotency
 *     (state and identity unchanged).
 */
export async function test_api_notification_mark_unread_after_read(
  connection: api.IConnection,
) {
  // 1. Register member user (join) to obtain authenticated memberUser context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/auth/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. As memberUser, create a community
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
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create membership in the community for the same memberUser
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

  // 4. Create a post in the community as memberUser
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

  // 5. Create a comment on the post as memberUser
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 6. Register adminUser and authenticate
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!", // satisfies password format
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 7. As adminUser, create a notification for the memberUser targeting the comment
  const notificationCreateBody = {
    community_platform_memberuser_id: memberAuthorized.id,
    category: "comment_reply",
    title: "New reply to your post",
    body: RandomGenerator.paragraph({ sentences: 3 }),
    target_type: "comment",
    target_id: comment.id,
    is_read: false,
  } satisfies ICommunityPlatformNotification.ICreate;

  const createdNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert<ICommunityPlatformNotification>(createdNotification);

  // Snapshot key identity fields before markUnread
  const originalId = createdNotification.id;
  const originalCategory = createdNotification.category;
  const originalTitle = createdNotification.title;
  const originalBody = createdNotification.body ?? null;
  const originalTargetType = createdNotification.target_type ?? null;
  const originalTargetId = createdNotification.target_id ?? null;
  const originalCreatedAt = createdNotification.created_at;

  // 8. Switch back to memberUser context by logging in as memberUser
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/auth/login",
    referrer: "https://client.example.com/notifications",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoggedIn);

  // 9. Call markUnread for the notification as memberUser
  const unreadOnce: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.markUnread.update(
      connection,
      { notificationId: originalId },
    );
  typia.assert<ICommunityPlatformNotification>(unreadOnce);

  // 10. Validate unreadOnce
  TestValidator.equals(
    "notification id should remain the same after first markUnread",
    unreadOnce.id,
    originalId,
  );
  TestValidator.equals(
    "category should remain unchanged after first markUnread",
    unreadOnce.category,
    originalCategory,
  );
  TestValidator.equals(
    "title should remain unchanged after first markUnread",
    unreadOnce.title,
    originalTitle,
  );
  TestValidator.equals(
    "body should remain unchanged after first markUnread",
    unreadOnce.body ?? null,
    originalBody,
  );
  TestValidator.equals(
    "target_type should remain unchanged after first markUnread",
    unreadOnce.target_type ?? null,
    originalTargetType,
  );
  TestValidator.equals(
    "target_id should remain unchanged after first markUnread",
    unreadOnce.target_id ?? null,
    originalTargetId,
  );
  TestValidator.equals(
    "created_at should remain unchanged after first markUnread",
    unreadOnce.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "notification should be unread (is_read === false) after first markUnread",
    unreadOnce.is_read === false,
  );

  TestValidator.predicate(
    "read_at should be cleared (null or undefined) after first markUnread",
    unreadOnce.read_at === null || unreadOnce.read_at === undefined,
  );

  // 11. Call markUnread again to validate idempotency
  const unreadTwice: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.markUnread.update(
      connection,
      { notificationId: originalId },
    );
  typia.assert<ICommunityPlatformNotification>(unreadTwice);

  // Validate idempotency and stability of core fields
  TestValidator.equals(
    "notification id should remain the same after second markUnread",
    unreadTwice.id,
    originalId,
  );
  TestValidator.equals(
    "category should remain unchanged after second markUnread",
    unreadTwice.category,
    originalCategory,
  );
  TestValidator.equals(
    "title should remain unchanged after second markUnread",
    unreadTwice.title,
    originalTitle,
  );
  TestValidator.equals(
    "body should remain unchanged after second markUnread",
    unreadTwice.body ?? null,
    originalBody,
  );
  TestValidator.equals(
    "target_type should remain unchanged after second markUnread",
    unreadTwice.target_type ?? null,
    originalTargetType,
  );
  TestValidator.equals(
    "target_id should remain unchanged after second markUnread",
    unreadTwice.target_id ?? null,
    originalTargetId,
  );
  TestValidator.equals(
    "created_at should remain unchanged after second markUnread",
    unreadTwice.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "notification should still be unread (is_read === false) after second markUnread",
    unreadTwice.is_read === false,
  );
  TestValidator.predicate(
    "read_at should remain cleared after second markUnread",
    unreadTwice.read_at === null || unreadTwice.read_at === undefined,
  );
}
