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
 * Validate member notification detail for a comment-reply category.
 *
 * Business workflow:
 *
 * 1. A member user joins the platform and gets authenticated.
 * 2. The member creates a community.
 * 3. The member joins that community as a regular member.
 * 4. The member creates a post inside that community.
 * 5. The member creates a comment on that post.
 * 6. An admin user joins and becomes authenticated.
 * 7. The admin creates a notification targeting that member’s specific comment,
 *    with category like "comment_reply" and target_type "comment".
 * 8. The member logs back in and fetches the notification detail via GET
 *    /communityPlatform/memberUser/notifications/{notificationId}.
 *
 * The test verifies that the notification detail correctly reflects:
 *
 * - Category equal to the value used at creation (e.g., "comment_reply"),
 * - Target_type and target_id pointing to the created comment,
 * - Title and body equal to the admin-created values, and
 * - Is_read is false on first retrieval, with timestamps present.
 */
export async function test_api_notification_detail_for_comment_reply_category(
  connection: api.IConnection,
) {
  // 1. Member joins (registration + authenticated context)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 2. Member creates a community
  const communityCreateBody = {
    slug: `${RandomGenerator.alphabets(6)}-community`,
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

  // 3. Member joins the community (membership)
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

  // 4. Member creates a post in the community
  const postCreateBody = {
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

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Member creates a comment on the post
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
  typia.assert(comment);

  // 6. Admin joins (registration + authenticated context)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}-admin@example.com`,
    password: "AdminPass123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 7. Admin creates a notification targeting the member comment
  const notificationCategory = "comment_reply";
  const notificationTargetType = "comment";
  const notificationTitle = "Someone replied to your comment";
  const notificationBodyText = "A new reply has been posted to your comment.";

  const notificationCreateBody = {
    community_platform_memberuser_id: member.id,
    category: notificationCategory,
    title: notificationTitle,
    body: notificationBodyText,
    target_type: notificationTargetType,
    target_id: comment.id,
    is_read: null,
  } satisfies ICommunityPlatformNotification.ICreate;

  const createdNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert(createdNotification);

  // 8. Switch back to member session using login
  const memberLoginBody = {
    identifier: member.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const reAuthedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(reAuthedMember);

  // 9. Member fetches the notification detail
  const fetchedNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.at(
      connection,
      {
        notificationId: createdNotification.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(fetchedNotification);

  // Business assertions on notification detail
  TestValidator.equals(
    "notification category should match creation value",
    fetchedNotification.category,
    notificationCategory,
  );

  TestValidator.equals(
    "notification target_type should match creation value",
    fetchedNotification.target_type ?? null,
    notificationTargetType,
  );

  TestValidator.equals(
    "notification target_id should match comment id",
    fetchedNotification.target_id ?? null,
    comment.id,
  );

  TestValidator.equals(
    "notification title should match creation title",
    fetchedNotification.title,
    notificationTitle,
  );

  TestValidator.equals(
    "notification body should match creation body",
    fetchedNotification.body ?? null,
    notificationBodyText,
  );

  TestValidator.equals(
    "notification should be unread on first fetch",
    fetchedNotification.is_read,
    false,
  );

  // created_at and updated_at presence is already guaranteed by typia.assert,
  // but we can still assert that they are non-empty strings for clarity.
  TestValidator.predicate(
    "notification created_at must be a non-empty string",
    fetchedNotification.created_at.length > 0,
  );

  TestValidator.predicate(
    "notification updated_at must be a non-empty string",
    fetchedNotification.updated_at.length > 0,
  );
}
