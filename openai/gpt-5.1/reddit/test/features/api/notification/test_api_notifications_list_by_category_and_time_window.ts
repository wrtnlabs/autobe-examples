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

export async function test_api_notifications_list_by_category_and_time_window(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) and keep credentials
  const memberUsername = RandomGenerator.alphabets(10);
  const memberEmail = `member_${RandomGenerator.alphabets(8)}@example.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As the member user, create a community
  const communitySlug = `community-${RandomGenerator.alphabets(8)}`;
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

  // 3. Join the community as a member
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

  // 4. Create a post in that community
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

  // 5. Create a comment on the post
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

  // 6. Register an admin user (join)
  const adminUsername = `admin_${RandomGenerator.alphabets(8)}`;
  const adminEmail = `admin_${RandomGenerator.alphabets(8)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. As admin, create two notifications for the member user
  const targetCategory = "comment_reply";
  const otherCategory = "system";

  const now = new Date();

  const targetNotificationBody = {
    community_platform_memberuser_id: memberAuthorized.id,
    category: targetCategory,
    title: "You have a new comment reply",
    body: RandomGenerator.paragraph({ sentences: 3 }),
    target_type: "comment",
    target_id: comment.id,
    is_read: false,
  } satisfies ICommunityPlatformNotification.ICreate;

  const targetNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: targetNotificationBody,
      },
    );
  typia.assert(targetNotification);

  const otherNotificationBody = {
    community_platform_memberuser_id: memberAuthorized.id,
    category: otherCategory,
    title: "System maintenance announcement",
    body: RandomGenerator.paragraph({ sentences: 3 }),
    target_type: "system",
    target_id: null,
    is_read: false,
  } satisfies ICommunityPlatformNotification.ICreate;

  const otherNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: otherNotificationBody,
      },
    );
  typia.assert(otherNotification);

  // 8. Switch back to member user via login to ensure member context is active
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/notifications",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // 9. Build filter window around now
  // Use a small window that should include both created notifications, as they were just created.
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString(); // 5 minutes before
  const windowEnd = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 minutes after

  const filterRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    onlyUnread: undefined,
    categories: [targetCategory],
    targetTypes: undefined,
    createdFrom: windowStart,
    createdTo: windowEnd,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformNotification.IRequest;

  // 10. Call notifications.index as the member user
  const pageResult: IPageICommunityPlatformNotification.ISummary =
    await api.functional.communityPlatform.memberUser.notifications.index(
      connection,
      { body: filterRequestBody },
    );
  typia.assert(pageResult);

  // 11. Basic assertions on pagination and data presence
  TestValidator.predicate(
    "notification page should contain at least one record",
    pageResult.data.length > 0,
  );

  // 12. Assert all returned notifications match the category and time window
  for (const notif of pageResult.data) {
    typia.assert<ICommunityPlatformNotification.ISummary>(notif);

    TestValidator.equals(
      "notification category must equal filtered category",
      notif.category,
      targetCategory,
    );

    const createdAtDate = new Date(notif.created_at);
    const fromDate = new Date(windowStart);
    const toDate = new Date(windowEnd);

    TestValidator.predicate(
      "notification.created_at must be within the requested time window",
      createdAtDate.getTime() >= fromDate.getTime() &&
        createdAtDate.getTime() <= toDate.getTime(),
    );

    TestValidator.notEquals(
      "notifications with other categories must not appear in filtered results",
      notif.category,
      otherCategory,
    );
  }
}
