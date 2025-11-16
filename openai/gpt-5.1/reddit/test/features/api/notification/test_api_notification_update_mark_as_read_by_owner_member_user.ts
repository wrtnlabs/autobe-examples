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

export async function test_api_notification_update_mark_as_read_by_owner_member_user(
  connection: api.IConnection,
) {
  // 1. Register memberUser (owner of the notification) via join
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // Capture member basics for later use
  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Register adminUser via join
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin#" + RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  const adminId: string & tags.Format<"uuid"> = adminAuthorized.id;
  TestValidator.predicate(
    "admin user id should be a non-empty uuid",
    typeof adminId === "string" && adminId.length > 0,
  );

  // 3. Switch back to memberUser context (login) to create community, membership, post, comment
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAfterLogin);
  TestValidator.equals(
    "logged in member id matches joined member id",
    memberAfterLogin.id,
    memberId,
  );

  // 4. Create a community as the member user
  const communitySlug = `comm-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
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

  TestValidator.equals(
    "community slug should match create payload",
    community.slug,
    communityCreateBody.slug,
  );
  TestValidator.equals(
    "community owner should be the member user",
    community.owner_memberuser_id,
    memberId,
  );

  // 5. Create community membership for this member in that community
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

  TestValidator.equals(
    "membership community slug should match community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership member id should match member user",
    membership.memberUser.id,
    memberId,
  );

  // 6. Create a post in the community as the member user
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
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "post community id should match created community",
    post.community_id,
    community.id,
  );

  // 7. Create a comment on that post as the member user
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
  typia.assert<ICommunityPlatformComment>(comment);

  TestValidator.equals(
    "comment post id should match target post",
    comment.post.id,
    post.id,
  );

  // 8. Switch to adminUser context (login) and create a notification targeting the member user and this comment
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAfterLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAfterLogin);
  TestValidator.equals(
    "logged in admin id matches joined admin id",
    adminAfterLogin.id,
    adminId,
  );

  const notificationCreateBody = {
    community_platform_memberuser_id: memberId,
    category: "comment_reply",
    title: "New reply to your post",
    body: "An admin has sent you a notification related to a comment.",
    target_type: "comment",
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
  typia.assert<ICommunityPlatformNotification>(createdNotification);

  // Basic invariants on the created notification
  TestValidator.equals(
    "notification category should match create payload",
    createdNotification.category,
    notificationCreateBody.category,
  );
  TestValidator.equals(
    "notification title should match create payload",
    createdNotification.title,
    notificationCreateBody.title,
  );
  TestValidator.equals(
    "notification target_type should match create payload",
    createdNotification.target_type,
    notificationCreateBody.target_type,
  );
  TestValidator.equals(
    "notification target_id should match create payload",
    createdNotification.target_id,
    notificationCreateBody.target_id,
  );

  // 9. Switch back to memberUser context (login again) to update read state
  const memberRelogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberRelogin);
  TestValidator.equals(
    "re-logged in member id should still match",
    memberRelogin.id,
    memberId,
  );

  // 10. Member marks the notification as read
  const notificationUpdateBody = {
    is_read: true,
  } satisfies ICommunityPlatformNotification.IUpdate;

  const updatedNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.update(
      connection,
      {
        notificationId: createdNotification.id,
        body: notificationUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformNotification>(updatedNotification);

  // 11. Assert read status, read_at, and immutability of core fields
  TestValidator.equals(
    "notification id should remain unchanged after update",
    updatedNotification.id,
    createdNotification.id,
  );
  TestValidator.equals(
    "notification category should remain unchanged after update",
    updatedNotification.category,
    createdNotification.category,
  );
  TestValidator.equals(
    "notification title should remain unchanged after update",
    updatedNotification.title,
    createdNotification.title,
  );
  TestValidator.equals(
    "notification body should remain unchanged after update",
    updatedNotification.body,
    createdNotification.body,
  );
  TestValidator.equals(
    "notification target_type should remain unchanged after update",
    updatedNotification.target_type,
    createdNotification.target_type,
  );
  TestValidator.equals(
    "notification target_id should remain unchanged after update",
    updatedNotification.target_id,
    createdNotification.target_id,
  );

  TestValidator.equals(
    "notification should be marked as read",
    updatedNotification.is_read,
    true,
  );

  TestValidator.predicate(
    "read_at should be populated when notification is marked as read",
    updatedNotification.read_at !== null &&
      updatedNotification.read_at !== undefined &&
      typeof updatedNotification.read_at === "string" &&
      updatedNotification.read_at.length > 0,
  );
}
