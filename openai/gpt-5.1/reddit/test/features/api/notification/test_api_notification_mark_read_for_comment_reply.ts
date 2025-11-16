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
 * Mark a comment-reply notification as read and verify idempotent behavior.
 *
 * Business flow:
 *
 * 1. Register a member user (join) and keep their credentials.
 * 2. Register an admin user (join) and keep their credentials.
 * 3. As the member, create a community.
 * 4. As the member, join that community (membership create).
 * 5. As the member, create a post in that community.
 * 6. As the member, create a comment on that post.
 * 7. As the admin, create a notification targeting the member, with category
 *    "comment_reply" and target_type "comment" pointing to the created
 *    comment.
 * 8. As the member, call markRead on that notification.
 * 9. Assert that the notification is now read and has read_at set, while core
 *    fields are preserved.
 * 10. Call markRead again on the same notification and assert idempotency (state
 *     remains read and read_at is stable).
 */
export async function test_api_notification_mark_read_for_comment_reply(
  connection: api.IConnection,
) {
  // 1. Register member user via join (also logs in as that member)
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword: string = "Password123!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail as string & tags.Format<"email">,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register admin user via join (also logs in as that admin)
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword: string = "AdminPassword123!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail as string & tags.Format<"email">,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Switch back to member user for community/post/comment operations using login
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://client.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 3. Create community as member
  const communitySlugRaw = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communitySlug = communitySlugRaw as string &
    tags.MinLength<1> &
    tags.MaxLength<128>;

  const communityBody = {
    slug: communitySlug,
    name: RandomGenerator.name(2) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
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
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 4. Member joins community (membership create)
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

  // 5. Create post in that community as member
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 6. Create a comment on that post as member
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<10000>,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 7. Switch to admin user and create notification pointing to the comment
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://client.example.com/admin/login" as string &
      tags.Format<"uri">,
    referrer: "https://client.example.com/admin" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  const notificationCreateBody = {
    community_platform_memberuser_id: memberAuthorized.id,
    category: "comment_reply",
    title: "You have a new reply to your comment",
    body: "Someone replied to your comment.",
    target_type: "comment",
    target_id: comment.id,
  } satisfies ICommunityPlatformNotification.ICreate;

  const createdNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert(createdNotification);

  TestValidator.predicate(
    "notification initially unread",
    createdNotification.is_read === false,
  );
  TestValidator.predicate(
    "notification read_at initially null or undefined",
    createdNotification.read_at === null ||
      createdNotification.read_at === undefined,
  );

  // 8. Switch back to member user and call markRead
  const memberAuthorizedForRead: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedForRead);

  const firstMarked: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.markRead.update(
      connection,
      {
        notificationId: createdNotification.id,
      },
    );
  typia.assert(firstMarked);

  TestValidator.equals(
    "notification id preserved after markRead",
    firstMarked.id,
    createdNotification.id,
  );
  TestValidator.equals(
    "notification category preserved after markRead",
    firstMarked.category,
    createdNotification.category,
  );
  TestValidator.equals(
    "notification title preserved after markRead",
    firstMarked.title,
    createdNotification.title,
  );
  TestValidator.equals(
    "notification target_type preserved after markRead",
    firstMarked.target_type,
    createdNotification.target_type,
  );
  TestValidator.equals(
    "notification target_id preserved after markRead",
    firstMarked.target_id,
    createdNotification.target_id,
  );
  TestValidator.equals(
    "notification created_at preserved after markRead",
    firstMarked.created_at,
    createdNotification.created_at,
  );

  TestValidator.predicate(
    "notification is_read becomes true after markRead",
    firstMarked.is_read === true,
  );
  TestValidator.predicate(
    "notification read_at is set after markRead",
    firstMarked.read_at !== null && firstMarked.read_at !== undefined,
  );

  const readAtAfterFirst = firstMarked.read_at;

  // 9. Call markRead again to verify idempotency
  const secondMarked: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.markRead.update(
      connection,
      {
        notificationId: createdNotification.id,
      },
    );
  typia.assert(secondMarked);

  TestValidator.equals(
    "notification id stays the same on repeated markRead",
    secondMarked.id,
    firstMarked.id,
  );
  TestValidator.predicate(
    "notification stays read on repeated markRead",
    secondMarked.is_read === true,
  );
  TestValidator.predicate(
    "notification read_at remains non-null on repeated markRead",
    secondMarked.read_at !== null && secondMarked.read_at !== undefined,
  );
  TestValidator.equals(
    "notification read_at stable between markRead calls (idempotent)",
    secondMarked.read_at,
    readAtAfterFirst,
  );
}
