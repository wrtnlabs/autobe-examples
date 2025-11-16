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

export async function test_api_notification_update_forbidden_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Register memberUser A (notification owner) and obtain authorized context
  const memberAUsername: string = RandomGenerator.alphabets(8);
  const memberAEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAPassword: string = RandomGenerator.alphaNumeric(10);

  const memberAJoinBody = {
    username: memberAUsername,
    email: memberAEmail,
    password: memberAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. As memberUser A, create a community
  const communitySlug: string = RandomGenerator.alphabets(10);
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
  typia.assert(community);

  // 3. As memberUser A, create a membership in the community
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

  // 4. As memberUser A, create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. As memberUser A, create a comment under the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 6. Register an adminUser and authenticate as admin
  const adminUsername: string = RandomGenerator.alphabets(8);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPassword1!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. As adminUser, create a notification targeting memberUser A
  const notificationCreateBody = {
    community_platform_memberuser_id: memberA.id,
    category: "comment_reply",
    title: "New reply to your comment",
    body: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 8. Register memberUser B who will attempt an unauthorized update
  const memberBUsername: string = RandomGenerator.alphabets(8);
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();
  const memberBPassword: string = RandomGenerator.alphaNumeric(10);

  const memberBJoinBody = {
    username: memberBUsername,
    email: memberBEmail,
    password: memberBPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 9. As memberUser B, attempt to update notification owned by memberUser A
  const updateBodyByB = {
    is_read: true,
  } satisfies ICommunityPlatformNotification.IUpdate;

  await TestValidator.error(
    "non-owner memberUser cannot update another user's notification",
    async () => {
      await api.functional.communityPlatform.memberUser.notifications.update(
        connection,
        {
          notificationId: notification.id,
          body: updateBodyByB,
        },
      );
    },
  );

  // 10. Re-authenticate as memberUser A and successfully update the notification
  const memberALoginBody = {
    identifier: memberAUsername,
    password: memberAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  const updateBodyByA = {
    is_read: true,
  } satisfies ICommunityPlatformNotification.IUpdate;

  const updatedNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.update(
      connection,
      {
        notificationId: notification.id,
        body: updateBodyByA,
      },
    );
  typia.assert(updatedNotification);

  // 11. Validate that the notification is now marked as read for its owner
  TestValidator.equals(
    "notification is_read must be true after owner update",
    updatedNotification.is_read,
    true,
  );

  await TestValidator.predicate(
    "notification read_at should be populated after marking as read",
    async () =>
      updatedNotification.read_at !== null &&
      updatedNotification.read_at !== undefined,
  );
}
