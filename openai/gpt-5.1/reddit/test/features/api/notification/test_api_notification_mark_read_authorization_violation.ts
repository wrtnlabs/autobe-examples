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
 * Verify authorization and ownership rules for notification markRead.
 *
 * This E2E test builds a realistic multi-actor scenario around the
 * /communityPlatform/memberUser/notifications/{notificationId}/markRead
 * endpoint and validates that only the notification owner can mark it as read.
 *
 * Business flow:
 *
 * 1. Create two member users: Member A (notification owner) and Member B
 *    (different user who must not be allowed to mark A's notifications).
 * 2. As Member A, create a community, join it, create a post, and then create a
 *    comment to provide a realistic target for a notification.
 * 3. Register and authenticate an adminUser, then create a notification that
 *    targets Member A and points to the comment created in step 2.
 * 4. Switch authentication to Member B and attempt to mark the notification as
 *    read using markRead.update. This must fail with an authorization error,
 *    which we assert using TestValidator.error without inspecting specific HTTP
 *    status codes.
 * 5. Switch authentication back to Member A and call markRead.update again for the
 *    same notification. This call must succeed and return an
 *    ICommunityPlatformNotification where is_read is true and read_at is
 *    non-null, confirming correct ownership enforcement.
 *
 * Due to the absence of a dedicated notification read endpoint, we cannot
 * re-fetch the notification after the failed Member B attempt to directly prove
 * the record stayed unread. Instead, we rely on the contract that a failed
 * authorization call does not mutate state and then verify that the owner
 * (Member A) can successfully transition the notification to the read state.
 */
export async function test_api_notification_mark_read_authorization_violation(
  connection: api.IConnection,
) {
  // Step 1: Member A registration (join)
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup/memberA",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // Step 2: Member B registration (join)
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup/memberB",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // Step 3: Switch back to Member A via login
  const memberALoginBody = {
    identifier: memberA.email,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://example.com/login/memberA",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberAAfterLogin);

  // Step 4: Create a community as Member A
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
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
  typia.assert(community);

  // Step 5: Create membership for Member A in the community
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

  // Step 6: Create a post by Member A in the community
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

  // Step 7: Create a comment by Member A on the post
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

  // Step 8: Register an adminUser (admin join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Step 9: (Optional) Re-login as adminUser to verify login flow and ensure token
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/login/admin",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAfterLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // Step 10: Create a notification targeting Member A for the created comment
  const notificationCreateBody = {
    community_platform_memberuser_id: memberA.id,
    category: "comment_reply",
    title: "New comment on your post",
    body: RandomGenerator.paragraph({ sentences: 3 }),
    target_type: "comment",
    target_id: comment.id,
    is_read: false,
  } satisfies ICommunityPlatformNotification.ICreate;

  const notification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert(notification);

  // Validate initial unread state
  TestValidator.equals(
    "new notification should be unread initially",
    notification.is_read,
    false,
  );
  TestValidator.equals(
    "new notification should have null read_at initially",
    notification.read_at ?? null,
    null,
  );

  // Step 11: Switch authentication to Member B
  const memberBLoginBody = {
    identifier: memberB.email,
    password: memberBJoinBody.password,
    ip: null,
    href: "https://example.com/login/memberB",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberBAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBAfterLogin);

  // Step 12: As Member B, attempt to mark Member A's notification as read
  await TestValidator.error(
    "member B must not be able to mark member A's notification as read",
    async () => {
      await api.functional.communityPlatform.memberUser.notifications.markRead.update(
        connection,
        {
          notificationId: notification.id,
        },
      );
    },
  );

  // Step 14: Switch authentication back to Member A
  const memberALoginAgainBody = {
    identifier: memberA.email,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://example.com/login/memberA-again",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAReAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginAgainBody,
    });
  typia.assert(memberAReAuth);

  // Step 15: As Member A, successfully mark the notification as read
  const updatedNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.markRead.update(
      connection,
      {
        notificationId: notification.id,
      },
    );
  typia.assert(updatedNotification);

  // Business assertions for owner success
  TestValidator.equals(
    "updated notification id should match original",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "owner should see notification marked as read",
    updatedNotification.is_read,
    true,
  );
  TestValidator.predicate(
    "read_at should be non-null after owner marks notification as read",
    updatedNotification.read_at !== null &&
      updatedNotification.read_at !== undefined,
  );
}
