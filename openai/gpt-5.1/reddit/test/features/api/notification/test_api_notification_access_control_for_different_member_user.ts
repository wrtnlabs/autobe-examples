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
 * Validate per-recipient access control for member notifications.
 *
 * Business goal: Ensure that a notification addressed to Member A cannot be
 * retrieved by a different member (Member B), while remaining accessible to
 * Member A. This validates that GET
 * /communityPlatform/memberUser/notifications/{notificationId} enforces
 * ownership and does not leak existence of notifications to other members.
 *
 * Scenario steps:
 *
 * 1. Register Member A (join) to obtain ICommunityPlatformMemberuser.IAuthorized
 *    and keep their id, username, email, and login credentials.
 * 2. As Member A, create a community.
 * 3. As Member A, join that community via memberships.create.
 * 4. As Member A, create a post in that community.
 * 5. As Member A, create a comment on that post.
 * 6. Register an admin user and rely on SDK-authenticated admin context.
 * 7. As admin, create a notification for Member A that targets the created
 *    comment.
 * 8. Register Member B (join), which switches the SDK Authorization header to
 *    Member B.
 * 9. As Member B, attempt to GET the notification by id, expecting an error
 *    because the notification belongs to Member A. We only assert that an error
 *    is thrown, not the specific HTTP status.
 * 10. Switch back to Member A via login.
 * 11. As Member A, successfully GET the same notification and validate that it
 *     matches the created notification.
 */
export async function test_api_notification_access_control_for_different_member_user(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAUsername = RandomGenerator.alphabets(12);
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(12);

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

  // 2. As Member A, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
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

  // 3. As Member A, join the community
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

  // 4. As Member A, create a post in the community
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

  // 5. As Member A, create a comment on the post
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

  // 6. Register an admin user
  const adminUsername = RandomGenerator.alphabets(10);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 7. As admin, create a notification for Member A
  const notificationCreateBody = {
    community_platform_memberuser_id: memberA.id,
    category: "comment_reply",
    title: "New comment activity",
    body: "You have a new comment notification.",
    target_type: "comment",
    target_id: comment.id,
    is_read: null,
  } satisfies ICommunityPlatformNotification.ICreate;

  const createdNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert(createdNotification);

  // 8. Register Member B (this switches Authorization to Member B via SDK)
  const memberBUsername = RandomGenerator.alphabets(12);
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(12);

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

  // 9. As Member B, attempt to GET Member A's notification and expect an error
  await TestValidator.error(
    "member B cannot access notification belonging to member A",
    async () => {
      await api.functional.communityPlatform.memberUser.notifications.at(
        connection,
        {
          notificationId: createdNotification.id,
        },
      );
    },
  );

  // 10. Switch back to Member A via login
  const memberALoginBody = {
    identifier: memberAEmail,
    password: memberAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAReauth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberAReauth);

  // 11. As Member A, successfully GET the same notification
  const fetchedByMemberA: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.at(
      connection,
      {
        notificationId: createdNotification.id,
      },
    );
  typia.assert(fetchedByMemberA);

  // Validate that the fetched notification matches the created one
  TestValidator.equals(
    "notification id should match between created and fetched records",
    fetchedByMemberA.id,
    createdNotification.id,
  );
  TestValidator.equals(
    "notification category should be preserved",
    fetchedByMemberA.category,
    createdNotification.category,
  );
  TestValidator.equals(
    "notification title should be preserved",
    fetchedByMemberA.title,
    createdNotification.title,
  );
  TestValidator.equals(
    "notification body should be preserved",
    fetchedByMemberA.body,
    createdNotification.body,
  );
  TestValidator.equals(
    "notification target_id should be preserved",
    fetchedByMemberA.target_id,
    createdNotification.target_id,
  );
}
