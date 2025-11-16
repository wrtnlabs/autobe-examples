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
 * Validate mark-all-read notifications flow for a member user.
 *
 * Business goal
 *
 * - Ensure that a newly registered member user can receive admin-generated
 *   notifications, see them as unread, invoke the `PUT
 *   /communityPlatform/memberUser/notifications/markAllRead` operation, and
 *   then observe that there are no remaining unread notifications.
 * - Verify idempotency by calling markAllRead twice and checking that the second
 *   invocation is a no-op that still succeeds and leaves the unread count at
 *   zero.
 *
 * High level scenario
 *
 * 1. Register a member user via memberUser join and keep their identity and tokens
 *    (connection is automatically updated by the SDK).
 * 2. As the member, create a community the user owns.
 * 3. As the member, create a membership entry for that community so the user is an
 *    explicit member.
 * 4. As the member, create a post in that community.
 * 5. As the member, create a comment on that post.
 * 6. Register an admin user via adminUser join; SDK switches connection to admin
 *    context.
 * 7. As the admin, create one or more notifications targeting the member user,
 *    linking them to the post (or comment) via target_type/target_id.
 * 8. Switch the SDK connection back to the member context by logging in as the
 *    member again.
 * 9. Query the member notifications index using onlyUnread: true and assert that
 *    there is at least one unread notification.
 * 10. Call markAllRead as the member.
 * 11. Query notifications again with onlyUnread: true and assert that there are
 *     zero unread notifications (data length === 0).
 * 12. Call markAllRead again and re-query to ensure the unread state remains zero,
 *     proving idempotency.
 */
export async function test_api_notifications_mark_all_read_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register primary member user
  const memberJoinInput = {
    username: RandomGenerator.alphabets(12),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://frontend.example.com/signup",
    referrer: "https://frontend.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. As member: create a community
  const communitySlug = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
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
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "created community slug must match request",
    community.slug,
    communitySlug,
  );

  // 3. As member: create membership for the community
  const membershipBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);
  TestValidator.equals(
    "membership community slug must match",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership member id must match authorized member",
    membership.memberUser.id,
    memberAuthorized.id,
  );

  // 4. As member: create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);
  TestValidator.equals(
    "post community id must match community.id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author id must match member id",
    post.author_memberuser_id,
    memberAuthorized.id,
  );

  // 5. As member: create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
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
    "comment must be attached to the same post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment author id must match member id",
    comment.author.id,
    memberAuthorized.id,
  );

  // 6. Register an admin user (connection switches to admin context)
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphabets(8)}`,
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 7. As admin: create notifications targeting the member user
  const notificationBodies: ICommunityPlatformNotification.ICreate[] = [
    {
      community_platform_memberuser_id: memberAuthorized.id,
      category: "comment_reply",
      title: "New reply on your post",
      body: "An admin has highlighted your recent comment.",
      target_type: "comment",
      target_id: comment.id,
    },
    {
      community_platform_memberuser_id: memberAuthorized.id,
      category: "post_activity",
      title: "Activity on your post",
      body: "Your post has new activity.",
      target_type: "post",
      target_id: post.id,
    },
  ];

  const createdNotifications: ICommunityPlatformNotification[] = [];
  for (const body of notificationBodies) {
    const notification: ICommunityPlatformNotification =
      await api.functional.communityPlatform.adminUser.notifications.create(
        connection,
        { body },
      );
    typia.assert<ICommunityPlatformNotification>(notification);
    TestValidator.equals(
      "created notification should start as unread (is_read === false)",
      notification.is_read,
      false,
    );
    createdNotifications.push(notification);
  }

  TestValidator.equals(
    "number of created notifications must match bodies length",
    createdNotifications.length,
    notificationBodies.length,
  );

  // 8. Switch back to member context via login
  const memberLoginBody = {
    identifier: memberJoinInput.email,
    password: memberJoinInput.password,
    ip: null,
    href: "https://frontend.example.com/login",
    referrer: "https://frontend.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);
  TestValidator.equals(
    "logged-in member id must match original member",
    memberLoginAuthorized.id,
    memberAuthorized.id,
  );

  // 9. Member: fetch unread notifications before markAllRead
  const beforeSearchBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    onlyUnread: true,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformNotification.IRequest;

  const beforePage: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      {
        body: beforeSearchBody,
      },
    );
  typia.assert<IPageICommunityPlatformNotification.ISummary>(beforePage);

  const unreadBefore = beforePage.data;
  TestValidator.predicate(
    "there should be at least one unread notification before markAllRead",
    unreadBefore.length > 0,
  );

  for (const n of unreadBefore) {
    TestValidator.equals(
      "all notifications in unreadBefore must have is_read === false",
      n.is_read,
      false,
    );
  }

  // 10. Call markAllRead as member
  await api.functional.communityPlatform.memberUser.notifications.markAllRead(
    connection,
  );

  // 11. Fetch unread notifications after markAllRead
  const afterSearchBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    onlyUnread: true,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformNotification.IRequest;

  const afterPage: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      {
        body: afterSearchBody,
      },
    );
  typia.assert<IPageICommunityPlatformNotification.ISummary>(afterPage);

  const unreadAfter = afterPage.data;
  TestValidator.equals(
    "after markAllRead there must be zero unread notifications",
    unreadAfter.length,
    0,
  );

  // 12. Idempotency: call markAllRead again and ensure still zero unread
  await api.functional.communityPlatform.memberUser.notifications.markAllRead(
    connection,
  );

  const afterSecondPage: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      {
        body: afterSearchBody,
      },
    );
  typia.assert<IPageICommunityPlatformNotification.ISummary>(afterSecondPage);

  const unreadAfterSecond = afterSecondPage.data;
  TestValidator.equals(
    "after second markAllRead invocation, unread notifications must still be zero",
    unreadAfterSecond.length,
    0,
  );
}
