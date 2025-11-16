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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotification";

export async function test_api_notifications_mark_all_read_respects_soft_deleted(
  connection: api.IConnection,
) {
  // 1. Register memberUser (join acts as authenticated session)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member creates a community
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
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Member joins the community (membership)
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

  // 4. Member creates a post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
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
      body: postBody,
    });
  typia.assert(post);

  // 5. Member adds a comment to the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 6. Register adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. (Optional) explicit admin login to ensure separate flow is valid
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 8. As adminUser, create two notifications targeting the memberUser
  const notificationCreateBody1 = {
    community_platform_memberuser_id: memberAuthorized.id,
    category: "comment_reply",
    title: "New reply to your comment",
    body: RandomGenerator.paragraph({ sentences: 3 }),
    target_type: "comment",
    target_id: comment.id as string & tags.Format<"uuid">,
    is_read: false,
  } satisfies ICommunityPlatformNotification.ICreate;

  const notification1: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationCreateBody1,
      },
    );
  typia.assert(notification1);

  const notificationCreateBody2 = {
    community_platform_memberuser_id: memberAuthorized.id,
    category: "post_engagement",
    title: "Your post is getting attention",
    body: RandomGenerator.paragraph({ sentences: 3 }),
    target_type: "post",
    target_id: post.id as string & tags.Format<"uuid">,
    is_read: false,
  } satisfies ICommunityPlatformNotification.ICreate;

  const notification2: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationCreateBody2,
      },
    );
  typia.assert(notification2);

  // 9. Switch back to memberUser session explicitly via login
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 10. List notifications as memberUser before deletion (only unread)
  const initialListBody = {
    page: 0,
    limit: 10,
    onlyUnread: true,
    categories: undefined,
    targetTypes: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformNotification.IRequest;

  const initialPage: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      { body: initialListBody },
    );
  typia.assert(initialPage);

  TestValidator.predicate(
    "initial unread notifications should be at least 2",
    initialPage.data.length >= 2,
  );

  // Ensure both created notifications appear in the listing
  const initialIds = initialPage.data.map((n) => n.id);
  TestValidator.predicate(
    "notification1 should be in initial listing",
    initialIds.includes(notification1.id),
  );
  TestValidator.predicate(
    "notification2 should be in initial listing",
    initialIds.includes(notification2.id),
  );

  // 11. Soft-delete one notification as the memberUser
  await api.functional.communityPlatform.memberUser.notifications.erase(
    connection,
    { notificationId: notification1.id as string & tags.Format<"uuid"> },
  );

  // 12. List notifications again (only unread) to confirm deletion
  const afterDeletePage: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      { body: initialListBody },
    );
  typia.assert(afterDeletePage);

  const afterDeleteIds = afterDeletePage.data.map((n) => n.id);

  TestValidator.predicate(
    "soft-deleted notification should not appear in unread listing",
    !afterDeleteIds.includes(notification1.id),
  );
  TestValidator.predicate(
    "non-deleted notification should still appear before markAllRead",
    afterDeleteIds.includes(notification2.id),
  );

  // All notifications in afterDeletePage should be unread
  TestValidator.predicate(
    "remaining notifications before markAllRead should be unread",
    afterDeletePage.data.every((n) => n.is_read === false),
  );

  // 13. Call markAllRead as memberUser
  await api.functional.communityPlatform.memberUser.notifications.markAllRead(
    connection,
  );

  // 14. List notifications without onlyUnread filter to observe read state
  const listAfterMarkAllBody = {
    page: 0,
    limit: 10,
    onlyUnread: false,
    categories: undefined,
    targetTypes: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformNotification.IRequest;

  const afterMarkAllPage: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      { body: listAfterMarkAllBody },
    );
  typia.assert(afterMarkAllPage);

  const afterMarkAllIds = afterMarkAllPage.data.map((n) => n.id);

  // Soft-deleted notification should still not appear
  TestValidator.predicate(
    "soft-deleted notification should still be absent after markAllRead",
    !afterMarkAllIds.includes(notification1.id),
  );

  // Non-deleted notification should be present and marked as read
  const remaining = afterMarkAllPage.data.find(
    (n) => n.id === notification2.id,
  );

  TestValidator.predicate(
    "non-deleted notification should still be present after markAllRead",
    remaining !== undefined,
  );

  if (remaining !== undefined) {
    TestValidator.predicate(
      "remaining notification should be marked as read after markAllRead",
      remaining.is_read === true,
    );
  }

  // 15. List notifications with onlyUnread=true to verify no unread remain
  const unreadAfterMarkAllBody = {
    page: 0,
    limit: 10,
    onlyUnread: true,
    categories: undefined,
    targetTypes: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformNotification.IRequest;

  const unreadAfterMarkAllPage: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      { body: unreadAfterMarkAllBody },
    );
  typia.assert(unreadAfterMarkAllPage);

  TestValidator.equals(
    "no unread notifications should remain after markAllRead",
    unreadAfterMarkAllPage.data.length,
    0,
  );
}
