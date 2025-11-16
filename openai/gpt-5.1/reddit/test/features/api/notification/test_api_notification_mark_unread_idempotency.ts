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
 * Validate idempotent behavior of marking a notification as unread.
 *
 * Business goal
 *
 * - Ensure that calling markUnread on an already-unread notification is safe and
 *   does not introduce unintended side effects.
 * - Confirm that the notification remains logically unread across repeated calls
 *   while core identity and targeting metadata remain stable.
 *
 * Scenario
 *
 * 1. Create a member user (acts as notification recipient).
 * 2. As that member, create a community.
 * 3. Join the community (membership creation).
 * 4. Create a post in the community.
 * 5. Create a comment on the post.
 * 6. Create an admin user and log in as admin.
 * 7. As admin, create a notification targeting the member and the comment, with
 *    is_read = false.
 * 8. Log back in as the member user.
 * 9. Call markUnread once on the notification.
 * 10. Call markUnread a second time on the same notification.
 *
 * Validations
 *
 * - The notification created by admin is initially unread (is_read === false,
 *   read_at === null).
 * - First markUnread:
 *
 *   - Keeps is_read === false and read_at === null.
 *   - Preserves id, category, target_type, and target_id.
 * - Second markUnread:
 *
 *   - Still returns is_read === false and read_at === null.
 *   - Preserves id, category, target_type, and target_id.
 * - Created_at remains stable across all three snapshots (created, firstResult,
 *   secondResult).
 * - Updated_at of secondResult is greater than or equal to updated_at of
 *   firstResult, demonstrating that repeated calls are allowed but do not
 *   change the logical read state.
 */
export async function test_api_notification_mark_unread_idempotency(
  connection: api.IConnection,
) {
  // 1. Register member user (join implicitly authenticates as that member)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As member, create a community
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
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create community membership for the member
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
  typia.assert(membership);

  // 4. Create a post in the community
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
  typia.assert(post);

  // 5. Create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(comment);

  // 6. Register admin user and then log in as admin
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Admin is now authenticated due to join side effect

  // 7. As admin, create an unread notification for the member and comment
  const notificationCreateBody = {
    community_platform_memberuser_id: memberAuthorized.id,
    category: "comment_reply",
    title: "New reply on your post",
    body: "Someone replied to your comment.",
    target_type: "comment",
    target_id: comment.id,
    is_read: false,
  } satisfies ICommunityPlatformNotification.ICreate;

  const createdNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      { body: notificationCreateBody },
    );
  typia.assert(createdNotification);

  // Validate initial unread state
  TestValidator.predicate(
    "notification initially unread",
    createdNotification.is_read === false,
  );
  TestValidator.equals(
    "notification initial read_at is null",
    createdNotification.read_at ?? null,
    null,
  );

  // 8. Log back in as member user to ensure correct actor context for markUnread
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberReAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReAuth);

  TestValidator.equals(
    "re-authenticated member id matches",
    memberReAuth.id,
    memberAuthorized.id,
  );

  // 9. First markUnread call
  const firstResult: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.markUnread.update(
      connection,
      { notificationId: createdNotification.id },
    );
  typia.assert(firstResult);

  // Basic identity stability checks after first markUnread
  TestValidator.equals(
    "first markUnread preserves id",
    firstResult.id,
    createdNotification.id,
  );
  TestValidator.equals(
    "first markUnread preserves category",
    firstResult.category,
    createdNotification.category,
  );
  TestValidator.equals(
    "first markUnread preserves target_type",
    firstResult.target_type ?? null,
    createdNotification.target_type ?? null,
  );
  TestValidator.equals(
    "first markUnread preserves target_id",
    firstResult.target_id ?? null,
    createdNotification.target_id ?? null,
  );

  // Read state must remain unread
  TestValidator.predicate(
    "first markUnread keeps is_read false",
    firstResult.is_read === false,
  );
  TestValidator.equals(
    "first markUnread keeps read_at null",
    firstResult.read_at ?? null,
    null,
  );

  // created_at should remain stable
  TestValidator.equals(
    "first markUnread keeps created_at stable",
    firstResult.created_at,
    createdNotification.created_at,
  );

  // 10. Second markUnread call
  const secondResult: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.markUnread.update(
      connection,
      { notificationId: createdNotification.id },
    );
  typia.assert(secondResult);

  // Identity must remain stable
  TestValidator.equals(
    "second markUnread preserves id",
    secondResult.id,
    createdNotification.id,
  );
  TestValidator.equals(
    "second markUnread preserves category",
    secondResult.category,
    createdNotification.category,
  );
  TestValidator.equals(
    "second markUnread preserves target_type",
    secondResult.target_type ?? null,
    createdNotification.target_type ?? null,
  );
  TestValidator.equals(
    "second markUnread preserves target_id",
    secondResult.target_id ?? null,
    createdNotification.target_id ?? null,
  );

  // Read state must remain unread across second call
  TestValidator.predicate(
    "second markUnread keeps is_read false",
    secondResult.is_read === false,
  );
  TestValidator.equals(
    "second markUnread keeps read_at null",
    secondResult.read_at ?? null,
    null,
  );

  // created_at still stable
  TestValidator.equals(
    "second markUnread keeps created_at stable",
    secondResult.created_at,
    createdNotification.created_at,
  );

  // updated_at ordering: secondResult.updated_at >= firstResult.updated_at
  // We compare lexicographically because these are ISO date-time strings.
  TestValidator.predicate(
    "updated_at is monotonic across idempotent calls",
    secondResult.updated_at >= firstResult.updated_at,
  );
}
