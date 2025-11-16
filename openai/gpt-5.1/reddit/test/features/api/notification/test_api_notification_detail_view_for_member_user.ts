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

export async function test_api_notification_detail_view_for_member_user(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authorized context
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
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Create a community as the member user
  const communitySlug: string & tags.MinLength<1> & tags.MaxLength<128> =
    RandomGenerator.alphabets(8) as string as string &
      tags.MinLength<1> &
      tags.MaxLength<128>;
  const communityName: string & tags.MinLength<1> & tags.MaxLength<255> =
    RandomGenerator.paragraph({ sentences: 2 }) as string as string &
      tags.MinLength<1> &
      tags.MaxLength<255>;
  const communityDescription: string & tags.MaxLength<4000> =
    RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }) as string as string & tags.MaxLength<4000>;

  const communityCreateBody = {
    slug: communitySlug,
    name: communityName,
    description: communityDescription,
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Join the created community as a member
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
    "membership community slug should match created community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership member user id should match joined member",
    membership.memberUser.id,
    memberId,
  );

  // 4. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 8,
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

  // 5. Create a comment on the post
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
  typia.assert<ICommunityPlatformComment>(comment);

  TestValidator.equals(
    "comment post id should match post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment author id should match member",
    comment.author.id,
    memberId,
  );

  // 6. Register an admin user and obtain admin authorization
  const adminUsername: string = `admin_${RandomGenerator.alphabets(6)}`;
  const adminEmail: string & tags.Format<"email"> =
    `admin_${RandomGenerator.alphaNumeric(8)}@example.com` as string as string &
      tags.Format<"email">;
  const adminPassword: string & tags.Format<"password"> =
    "AdminPassword123!" as string as string & tags.Format<"password">;

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 7. (Optional) login admin again to ensure token context (not strictly necessary)
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoggedIn);

  // 8. Create a notification targeting the member and referring to the comment
  const notificationCategory = "comment_reply";
  const notificationTitle = "You have a new reply on your comment";
  const notificationBodyText = `Your comment on post '${post.title}' received a reply.`;

  const notificationCreateBody = {
    community_platform_memberuser_id: memberId,
    category: notificationCategory,
    title: notificationTitle,
    body: notificationBodyText,
    target_type: "comment",
    target_id: comment.id,
    is_read: false,
  } satisfies ICommunityPlatformNotification.ICreate;

  const adminCreatedNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationCreateBody,
      },
    );
  typia.assert<ICommunityPlatformNotification>(adminCreatedNotification);

  TestValidator.equals(
    "admin-created notification category should match payload",
    adminCreatedNotification.category,
    notificationCategory,
  );
  TestValidator.equals(
    "admin-created notification target id should match comment id",
    adminCreatedNotification.target_id,
    comment.id,
  );

  const notificationId: string & tags.Format<"uuid"> =
    adminCreatedNotification.id as string & tags.Format<"uuid">;

  // 9. Switch back to member user context via login
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://client.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoggedIn);

  // 10. Retrieve the notification via memberUser notifications.at
  const fetched: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.at(
      connection,
      {
        notificationId,
      },
    );
  typia.assert<ICommunityPlatformNotification>(fetched);

  // Business validations on fetched notification
  TestValidator.equals(
    "fetched notification id should match created notification id",
    fetched.id,
    adminCreatedNotification.id,
  );
  TestValidator.equals(
    "fetched notification category should match creation payload",
    fetched.category,
    notificationCategory,
  );
  TestValidator.equals(
    "fetched notification title should match creation payload",
    fetched.title,
    notificationTitle,
  );
  TestValidator.equals(
    "fetched notification body should match creation payload",
    fetched.body ?? null,
    notificationBodyText,
  );
  TestValidator.equals(
    "fetched notification target type should be 'comment'",
    fetched.target_type ?? null,
    "comment",
  );
  TestValidator.equals(
    "fetched notification target id should match comment id",
    fetched.target_id ?? null,
    comment.id,
  );

  TestValidator.predicate(
    "newly created notification should be unread",
    fetched.is_read === false,
  );

  TestValidator.predicate(
    "newly created notification read_at should be null or undefined",
    fetched.read_at === null || fetched.read_at === undefined,
  );

  TestValidator.predicate(
    "fetched notification created_at should be a non-empty string",
    typeof fetched.created_at === "string" && fetched.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched notification updated_at should be a non-empty string",
    typeof fetched.updated_at === "string" && fetched.updated_at.length > 0,
  );
}
