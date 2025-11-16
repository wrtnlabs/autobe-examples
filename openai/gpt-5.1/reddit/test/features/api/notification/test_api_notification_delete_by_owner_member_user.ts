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

export async function test_api_notification_delete_by_owner_member_user(
  connection: api.IConnection,
) {
  // 1. Register member user (join) and get authorized context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community as this memberUser
  const communitySlug = RandomGenerator.alphaNumeric(12);
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
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "community slug should match requested slug",
    community.slug,
    communitySlug,
  );
  TestValidator.equals(
    "community owner should be the joined member user",
    community.owner_memberuser_id,
    memberAuthorized.id,
  );

  // 3. Create membership for the member in that community
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
    "membership memberUser id should match joined member",
    membership.memberUser.id,
    memberAuthorized.id,
  );

  // 4. Create a post in the community by the memberUser
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "post community id should match community",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author should be the member user",
    post.author_memberuser_id,
    memberAuthorized.id,
  );

  // 5. Create a comment on the post
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
  typia.assert<ICommunityPlatformComment>(comment);

  TestValidator.equals(
    "comment should belong to the created post",
    comment.post.id,
    post.id,
  );

  // 6. Register an adminUser (join) and get authorized context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  TestValidator.predicate(
    "admin user should be marked as admin (is_super_admin either true or false)",
    typeof adminAuthorized.is_super_admin === "boolean",
  );

  // 7. As adminUser, create a notification for the memberUser
  const notificationCreateBody = {
    community_platform_memberuser_id: memberAuthorized.id,
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
  typia.assert<ICommunityPlatformNotification>(notification);

  TestValidator.equals(
    "notification recipient should match the member user",
    notificationCreateBody.community_platform_memberuser_id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "notification category should be preserved",
    notification.category,
    notificationCreateBody.category,
  );
  TestValidator.equals(
    "notification target id should match comment id",
    notification.target_id,
    comment.id,
  );

  // 8. Switch back to the memberUser via login
  const memberLoginBody = {
    identifier: memberJoinBody.username,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/login/referrer",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoggedIn);

  TestValidator.equals(
    "logged-in member id should equal original member id",
    memberLoggedIn.id,
    memberAuthorized.id,
  );

  // 9. As the owning memberUser, delete the notification
  await api.functional.communityPlatform.memberUser.notifications.erase(
    connection,
    {
      notificationId: notification.id,
    },
  );

  // The erase endpoint returns void; reaching here without error is success.
  TestValidator.predicate(
    "notification erase should complete without throwing",
    true,
  );
}
