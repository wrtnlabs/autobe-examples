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
 * Verify that memberUser notification markUnread respects ownership-based
 * authorization.
 *
 * Business purpose: Ensure that a notification created for Member A cannot be
 * marked as unread by Member B, and that only the owning member can
 * successfully change the read state using the markUnread endpoint.
 *
 * Steps:
 *
 * 1. Register Member A with /auth/memberUser/join and keep their identity.
 * 2. Register Member B with /auth/memberUser/join as a separate member.
 * 3. With Member A authenticated (Authorization set by join), create a community
 *    using /communityPlatform/memberUser/communities.create.
 * 4. Create a membership for Member A in that community via
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.create.
 * 5. As Member A, create a post in that community with
 *    /communityPlatform/memberUser/posts.create.
 * 6. As Member A, create a comment on that post using
 *    /communityPlatform/memberUser/posts/{postId}/comments.create.
 * 7. Register an adminUser via /auth/adminUser/join and then log in that admin
 *    with /auth/adminUser/login to obtain admin Authorization.
 * 8. As the authenticated adminUser, create a notification targeting Member A
 *    using /communityPlatform/adminUser/notifications.create with a body that
 *    references the comment (target_type and target_id) and sets is_read:
 *    true.
 * 9. Switch authentication context to Member B via /auth/memberUser/login so that
 *    subsequent memberUser calls are executed as Member B.
 * 10. As Member B, attempt to mark Member A's notification as unread by calling
 *     /communityPlatform/memberUser/notifications/{notificationId}/markUnread
 *     via
 *     api.functional.communityPlatform.memberUser.notifications.markUnread.update.
 *     This should fail with an authorization error (403 or similar).
 * 11. Use TestValidator.error + TestValidator.httpError to assert that the
 *     unauthorized call indeed fails and does not succeed.
 * 12. Because we don't have a read endpoint for notifications, rely on the fact
 *     that the unauthorized attempt did not return a mutated notification; we
 *     assert only that the call fails and therefore cannot change state.
 * 13. Switch back to Member A by logging in as Member A via /auth/memberUser/login
 *     to ensure Authorization headers represent Member A for the next call.
 * 14. As Member A, call markUnread on the same notificationId. This should succeed
 *     and return an updated ICommunityPlatformNotification with is_read ===
 *     false and read_at === null, per unread semantics.
 * 15. Validate types of responses using typia.assert and use TestValidator
 *     assertions to enforce business logic expectations.
 */
export async function test_api_notification_mark_unread_authorization_violation(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<8>,
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberA);

  // 2. Register Member B
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<8>,
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberB);

  // 3. As Member A (current Authorization from previous join), create community
  const communityCreateBody = {
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
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 4. Create membership for Member A in the community
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

  // 5. As Member A, create a post in that community
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

  // 6. As Member A, create a comment on that post
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

  // 7. Register adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass!1" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  // 8. Login adminUser explicitly (to ensure proper Authorization header)
  const adminLoginBody = {
    identifier: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 9. As adminUser, create a notification targeting Member A referencing the comment
  const notificationCreateBody = {
    community_platform_memberuser_id: memberA.id,
    category: "comment_reply",
    title: "New reply on your post",
    body: RandomGenerator.paragraph({ sentences: 3 }),
    target_type: "comment",
    target_id: comment.id,
    is_read: true,
  } satisfies ICommunityPlatformNotification.ICreate;

  const notification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      { body: notificationCreateBody },
    );
  typia.assert<ICommunityPlatformNotification>(notification);

  TestValidator.predicate(
    "notification initially marked as read",
    notification.is_read === true,
  );

  // 10. Switch authentication context to Member B via login
  const memberBLoginBody = {
    identifier: memberB.email,
    password: memberBJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBLogin);

  // 11. As Member B, attempt to mark Member A's notification unread (should fail)
  await TestValidator.error(
    "member B cannot mark A's notification unread",
    async () => {
      await api.functional.communityPlatform.memberUser.notifications.markUnread.update(
        connection,
        {
          notificationId: notification.id,
        },
      );
    },
  );

  // 12. We can't re-fetch the notification; rely on the failure-only semantics.
  // Business assertion: unauthorized attempt failed and therefore cannot mutate state.

  // 13. Switch back to Member A using login
  const memberALoginBody = {
    identifier: memberA.email,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberALogin);

  // 14. As Member A, mark the notification unread (should succeed)
  const unreadNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.markUnread.update(
      connection,
      {
        notificationId: notification.id,
      },
    );
  typia.assert<ICommunityPlatformNotification>(unreadNotification);

  // 15. Validate read-state fields after successful markUnread
  TestValidator.predicate(
    "notification is_read becomes false after owner markUnread",
    unreadNotification.is_read === false,
  );

  TestValidator.predicate(
    "notification read_at is null when unread",
    unreadNotification.read_at === null,
  );
}
