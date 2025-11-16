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

export async function test_api_notification_update_mark_as_unread_toggle_back(
  connection: api.IConnection,
) {
  // 1. Register and authenticate memberUser via join
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As memberUser, create a community
  const communitySlug = RandomGenerator.alphabets(16);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.name(),
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

  // 3. Create a membership linking the memberUser to the community
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
    content: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 6. Switch to adminUser actor: join and login
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedJoin);

  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedLogin);

  // 7. As adminUser, create a notification targeting the memberUser and comment
  const notificationCreateBody = {
    community_platform_memberuser_id: memberAuthorized.id,
    category: "comment_reply",
    title: "New comment on your post",
    body: RandomGenerator.paragraph({ sentences: 5 }),
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
  typia.assert(createdNotification);

  // 8. Switch back to memberUser actor via login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedLogin);

  // 9. Mark notification as read via memberUser update
  const markReadBody = {
    is_read: true,
  } satisfies ICommunityPlatformNotification.IUpdate;

  const readNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.update(
      connection,
      {
        notificationId: createdNotification.id,
        body: markReadBody,
      },
    );
  typia.assert(readNotification);

  TestValidator.predicate(
    "notification should be marked as read",
    readNotification.is_read === true,
  );
  TestValidator.predicate(
    "read_at should be set when marked as read",
    readNotification.read_at !== null && readNotification.read_at !== undefined,
  );

  // Capture immutable fields from readNotification for later comparison
  const immutableFields = {
    id: readNotification.id,
    category: readNotification.category,
    title: readNotification.title,
    target_type: readNotification.target_type,
    target_id: readNotification.target_id,
    created_at: readNotification.created_at,
    deleted_at: readNotification.deleted_at,
  };
  const firstUpdatedAt: string & tags.Format<"date-time"> =
    readNotification.updated_at;

  // 10. Mark notification as unread via memberUser update
  const markUnreadBody = {
    is_read: false,
  } satisfies ICommunityPlatformNotification.IUpdate;

  const unreadNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.update(
      connection,
      {
        notificationId: createdNotification.id,
        body: markUnreadBody,
      },
    );
  typia.assert(unreadNotification);

  // 11. Assertions for unread state and immutability
  TestValidator.predicate(
    "notification should be marked as unread",
    unreadNotification.is_read === false,
  );

  TestValidator.predicate(
    "read_at should be cleared or absent when unread",
    unreadNotification.read_at === null ||
      unreadNotification.read_at === undefined,
  );

  TestValidator.equals(
    "immutable id should not change",
    unreadNotification.id,
    immutableFields.id,
  );
  TestValidator.equals(
    "immutable category should not change",
    unreadNotification.category,
    immutableFields.category,
  );
  TestValidator.equals(
    "immutable title should not change",
    unreadNotification.title,
    immutableFields.title,
  );
  TestValidator.equals(
    "immutable target_type should not change",
    unreadNotification.target_type,
    immutableFields.target_type,
  );
  TestValidator.equals(
    "immutable target_id should not change",
    unreadNotification.target_id,
    immutableFields.target_id,
  );
  TestValidator.equals(
    "immutable created_at should not change",
    unreadNotification.created_at,
    immutableFields.created_at,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged",
    unreadNotification.deleted_at,
    immutableFields.deleted_at,
  );

  TestValidator.predicate(
    "updated_at should be same or later after unread toggle",
    new Date(unreadNotification.updated_at).getTime() >=
      new Date(firstUpdatedAt).getTime(),
  );
}
