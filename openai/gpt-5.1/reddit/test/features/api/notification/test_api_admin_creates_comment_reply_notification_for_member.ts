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

export async function test_api_admin_creates_comment_reply_notification_for_member(
  connection: api.IConnection,
) {
  // 1. Register a member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Explicit member login to exercise login path and ensure token is active
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/login-referrer",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);

  TestValidator.equals(
    "member id from join and login should match",
    memberLoginAuthorized.id,
    memberAuthorized.id,
  );

  // 3. Create a community as the member
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

  TestValidator.equals(
    "community slug in response should match request",
    community.slug,
    communityCreateBody.slug,
  );

  // 4. Create a membership for that community
  const membershipCreateBody = {
    role: "member",
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
    "membership member id should match authorized member",
    membership.memberUser.id,
    memberAuthorized.id,
  );

  // 5. Create a post in that community
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
  typia.assert<ICommunityPlatformPost>(post);

  TestValidator.equals(
    "post community id should match community",
    post.community_id,
    community.id,
  );

  // 6. Create a comment on that post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
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

  TestValidator.equals(
    "comment post id summary should match post id",
    comment.post.id,
    post.id,
  );

  // 7. Register an admin account
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 8. Explicit admin login to ensure admin login endpoint works
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginAuthorized);

  TestValidator.equals(
    "admin id from join and login should match",
    adminLoginAuthorized.id,
    adminAuthorized.id,
  );

  // 9. Create a comment-related notification for the member as the admin
  const notificationCreateBody = {
    community_platform_memberuser_id: memberAuthorized.id,
    category: "comment_reply",
    title: "You have a new reply to your comment",
    body: `Your comment on the post "${post.title}" has a new reply.`,
    target_type: "comment",
    target_id: comment.id,
  } satisfies ICommunityPlatformNotification.ICreate;

  const notification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert<ICommunityPlatformNotification>(notification);

  // 10. Validate notification semantics
  TestValidator.equals(
    "notification category should match request",
    notification.category,
    notificationCreateBody.category,
  );
  TestValidator.equals(
    "notification title should match request",
    notification.title,
    notificationCreateBody.title,
  );
  TestValidator.equals(
    "notification body should match request",
    notification.body,
    notificationCreateBody.body,
  );
  TestValidator.equals(
    "notification target_type should match request",
    notification.target_type,
    notificationCreateBody.target_type,
  );
  TestValidator.equals(
    "notification target_id should match request",
    notification.target_id,
    notificationCreateBody.target_id,
  );

  TestValidator.predicate(
    "notification should be unread by default",
    notification.is_read === false,
  );
  TestValidator.equals(
    "notification read_at should be null on creation",
    notification.read_at ?? null,
    null,
  );
}
