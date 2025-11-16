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

/**
 * Verify that markAllRead affects only the authenticated member user's
 * notifications.
 *
 * Business context: A community platform member can receive notifications for
 * various events (posts, comments, moderation actions, etc.). The memberUser
 * endpoint /communityPlatform/memberUser/notifications/markAllRead is intended
 * to mark all unread notifications for the _current_ authenticated member as
 * read. It must not touch notifications belonging to other members.
 *
 * Steps:
 *
 * 1. Register Member A via auth.memberUser.join.
 * 2. Register Member B via auth.memberUser.join.
 * 3. As Member A, create a community and join it.
 * 4. As Member B, join the same community.
 * 5. As Member A, create a post and a comment in the community (for realistic
 *    context).
 * 6. Register an adminUser via auth.adminUser.join.
 * 7. As adminUser, create multiple notifications via
 *    adminUser.notifications.create:
 *
 *    - At least two notifications targeting Member A.
 *    - At least one notification targeting Member B.
 * 8. Log in as Member A (to ensure auth context) and call
 *    memberUser.notifications.index with onlyUnread=true to confirm Member A
 *    has at least one unread notification.
 * 9. Call memberUser.notifications.markAllRead as Member A.
 * 10. Call memberUser.notifications.index again for Member A with onlyUnread=true
 *     to assert there are no unread notifications remaining.
 * 11. Log in as Member B and call memberUser.notifications.index with
 *     onlyUnread=true to assert that Member B still has unread notifications
 *     (untouched by A's call).
 */
export async function test_api_notifications_mark_all_read_does_not_touch_others(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  const memberAId = memberA.id;

  // 2. Register Member B
  const memberBJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  const memberBId = memberB.id;

  // 3. As Member A, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const communitySlug = community.slug;

  // Ensure Member A is a member of the community
  const memberAMembershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const memberAMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: memberAMembershipBody,
      },
    );
  typia.assert(memberAMembership);

  // 4. Switch to Member B and join the same community
  const memberBLoginBody = {
    identifier: memberBJoinBody.email,
    password: memberBJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberBLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLoggedIn);

  const memberBMembershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const memberBMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: memberBMembershipBody,
      },
    );
  typia.assert(memberBMembership);

  // 5. Switch back to Member A and create a post and a comment
  const memberALoginBody = {
    identifier: memberAJoinBody.email,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberALoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoggedIn);

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

  // 6. Register an adminUser and log in as admin
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Create notifications for Member A and Member B as admin
  const createNotificationFor = async (
    recipientId: string & tags.Format<"uuid">,
    titleSuffix: string,
  ): Promise<ICommunityPlatformNotification> => {
    const body = {
      community_platform_memberuser_id: recipientId,
      category: "test_category",
      title: `Test notification ${titleSuffix}`,
      body: RandomGenerator.paragraph({ sentences: 3 }),
      target_type: "post",
      target_id: post.id,
      is_read: undefined,
    } satisfies ICommunityPlatformNotification.ICreate;

    const notification: ICommunityPlatformNotification =
      await api.functional.communityPlatform.adminUser.notifications.create(
        connection,
        {
          body,
        },
      );
    typia.assert(notification);
    return notification;
  };

  // At least two notifications for Member A
  const memberANotif1 = await createNotificationFor(
    memberAId as string & tags.Format<"uuid">,
    "A1",
  );
  const memberANotif2 = await createNotificationFor(
    memberAId as string & tags.Format<"uuid">,
    "A2",
  );

  // At least one notification for Member B
  const memberBNotif1 = await createNotificationFor(
    memberBId as string & tags.Format<"uuid">,
    "B1",
  );

  // Avoid unused variable warnings
  void memberANotif1;
  void memberANotif2;
  void memberBNotif1;

  // 8. Log back in as Member A and confirm unread notifications exist
  const memberARelogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberARelogin);

  const memberABeforePage: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      {
        body: {
          page: 0 as number & tags.Type<"int32">,
          limit: 50 as number & tags.Type<"int32">,
          onlyUnread: true,
          categories: undefined,
          targetTypes: undefined,
          createdFrom: undefined,
          createdTo: undefined,
          sortBy: "created_at",
          sortDirection: "desc",
        } satisfies ICommunityPlatformNotification.IRequest,
      },
    );
  typia.assert(memberABeforePage);

  TestValidator.predicate(
    "Member A should have at least one unread notification before markAllRead",
    memberABeforePage.pagination.records > 0,
  );

  TestValidator.predicate(
    "All notifications for Member A before markAllRead should be unread due to onlyUnread filter",
    memberABeforePage.data.every((n) => n.is_read === false),
  );

  // 9. Call markAllRead as Member A
  await api.functional.communityPlatform.memberUser.notifications.markAllRead(
    connection,
  );

  // 10. Confirm Member A has no unread notifications remaining
  const memberAAfterPage: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      {
        body: {
          page: 0 as number & tags.Type<"int32">,
          limit: 50 as number & tags.Type<"int32">,
          onlyUnread: true,
          categories: undefined,
          targetTypes: undefined,
          createdFrom: undefined,
          createdTo: undefined,
          sortBy: "created_at",
          sortDirection: "desc",
        } satisfies ICommunityPlatformNotification.IRequest,
      },
    );
  typia.assert(memberAAfterPage);

  TestValidator.equals(
    "Member A should have zero unread notifications after markAllRead",
    memberAAfterPage.pagination.records,
    0,
  );

  TestValidator.predicate(
    "Member A data list for unread notifications after markAllRead should be empty",
    memberAAfterPage.data.length === 0,
  );

  // 11. Log in as Member B and ensure their notifications remain unread
  const memberBRelogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBRelogin);

  const memberBBeforeAfterPage: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      {
        body: {
          page: 0 as number & tags.Type<"int32">,
          limit: 50 as number & tags.Type<"int32">,
          onlyUnread: true,
          categories: undefined,
          targetTypes: undefined,
          createdFrom: undefined,
          createdTo: undefined,
          sortBy: "created_at",
          sortDirection: "desc",
        } satisfies ICommunityPlatformNotification.IRequest,
      },
    );
  typia.assert(memberBBeforeAfterPage);

  TestValidator.predicate(
    "Member B should still have at least one unread notification after Member A markAllRead",
    memberBBeforeAfterPage.pagination.records > 0,
  );

  TestValidator.predicate(
    "All unread notifications for Member B should remain unread (is_read === false)",
    memberBBeforeAfterPage.data.every((n) => n.is_read === false),
  );
}
