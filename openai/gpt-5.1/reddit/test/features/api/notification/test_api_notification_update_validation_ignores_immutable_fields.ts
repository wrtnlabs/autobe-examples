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
 * Validate that memberUser notification update endpoint only changes read
 * state.
 *
 * Business goal:
 *
 * - Ensure that PUT /communityPlatform/memberUser/notifications/{notificationId}
 *   (api.functional.communityPlatform.memberUser.notifications.update) respects
 *   the immutability of notification core attributes and only manipulates read
 *   state via ICommunityPlatformNotification.IUpdate.
 *
 * Scenario steps:
 *
 * 1. Register a memberUser (recipient of the notification) with realistic join
 *    parameters.
 * 2. Register an adminUser (issuer of notifications).
 * 3. Authenticate as the memberUser and: 3-1) Create a community. 3-2) Join that
 *    community as a member (membership create). 3-3) Create a post in that
 *    community. 3-4) Create a comment on that post.
 * 4. Switch to adminUser context via admin login.
 * 5. As adminUser, create a notification via
 *    api.functional.communityPlatform.adminUser.notifications.create with:
 *
 *    - Community_platform_memberuser_id set to the memberUser.id.
 *    - Category/title/body simple random strings.
 *    - Target_type = "comment" and target_id = the created comment.id.
 *    - Is_read omitted so that backend applies default (expected false). Capture the
 *         created notification as `originalNotification`.
 * 6. Switch back to memberUser context via member login.
 * 7. As memberUser, call notifications.update(notificationId, { is_read: true }):
 *
 *    - Use api.functional.communityPlatform.memberUser.notifications.update with
 *         notificationId = originalNotification.id and body { is_read: true }
 *         satisfies ICommunityPlatformNotification.IUpdate.
 *    - Assert via typia.assert that response is a valid
 *         ICommunityPlatformNotification.
 *    - Assert business invariants with TestValidator:
 *
 *         - "is_read is set to true after marking read": is_read === true.
 *         - "category immutable on read update": category unchanged.
 *         - "title immutable on read update": title unchanged.
 *         - "body immutable on read update": body unchanged (string or null).
 *         - "target_type immutable on read update": target_type unchanged.
 *         - "target_id immutable on read update": target_id unchanged.
 *         - "id immutable on read update": id unchanged.
 *         - "read_at set when marking read": read_at is not null.
 *    - Optionally assert updated_at has changed or is >= original updated_at using
 *         string comparison on ISO timestamps.
 * 8. Call notifications.update again with { is_read: false }:
 *
 *    - Capture previous state (prevNotification) from step 7.
 *    - Send body { is_read: false } and get response `unreadNotification`.
 *    - Typia.assert(unreadNotification).
 *    - Assert:
 *
 *         - Is_read === false.
 *         - Id, category, title, body, target_type, target_id unchanged from
 *                   prevNotification.
 *         - Updated_at lexicographically >= prevNotification.updated_at.
 *         - Do NOT enforce a strict rule on read_at: description allows implementation to
 *                   clear or keep it. We only ensure it is either equal to
 *                   prevNotification.read_at or null.
 * 9. Call notifications.update with { is_read: null } (no-op semantics):
 *
 *    - Capture state before call (beforeNoop) from step 8.
 *    - Send body { is_read: null } and get response `noopNotification`.
 *    - Typia.assert(noopNotification).
 *    - Assert:
 *
 *         - Id, category, title, body, target_type, target_id unchanged.
 *         - Is_read === beforeNoop.is_read.
 *         - Read_at === beforeNoop.read_at.
 *         - Updated_at lexicographically >= beforeNoop.updated_at.
 *
 * This test purposefully avoids any invalid-type or extra-field payloads, since
 * ICommunityPlatformNotification.IUpdate only exposes is_read and TypeScript
 * compilation already prevents adding unsupported fields. All validations focus
 * on runtime business semantics under valid typing.
 */
export async function test_api_notification_update_validation_ignores_immutable_fields(
  connection: api.IConnection,
) {
  // 1. Register memberUser (join)
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
  typia.assert(memberAuthorized);

  // 2. Register adminUser (join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As memberUser, create community, membership, post, comment
  // At this point connection is authenticated as adminUser (join overwrote token),
  // so log back in as memberUser explicitly to ensure memberUser context.
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;
  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 3-1) Create community
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
  typia.assert(community);

  // 3-2) Join community membership as memberUser
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

  // 3-3) Create post in community
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

  // 3-4) Create comment on the post
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

  // 4. Switch to adminUser context (login)
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 5. As adminUser, create notification for memberUser
  const notificationCreateBody = {
    community_platform_memberuser_id: memberAuthorized.id,
    category: "comment_reply",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 4 }),
    target_type: "comment",
    target_id: comment.id,
    is_read: undefined,
  } satisfies ICommunityPlatformNotification.ICreate;

  const originalNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      { body: notificationCreateBody },
    );
  typia.assert(originalNotification);

  // 6. Switch back to memberUser context (login again)
  const memberLoginResult2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult2);

  // Helper for comparing immutable fields
  const assertImmutableFields = (
    title: string,
    before: ICommunityPlatformNotification,
    after: ICommunityPlatformNotification,
  ): void => {
    TestValidator.equals(`${title} - id immutable`, after.id, before.id);
    TestValidator.equals(
      `${title} - category immutable`,
      after.category,
      before.category,
    );
    TestValidator.equals(
      `${title} - title immutable`,
      after.title,
      before.title,
    );
    TestValidator.equals(
      `${title} - body immutable`,
      after.body ?? null,
      before.body ?? null,
    );
    TestValidator.equals(
      `${title} - target_type immutable`,
      after.target_type ?? null,
      before.target_type ?? null,
    );
    TestValidator.equals(
      `${title} - target_id immutable`,
      after.target_id ?? null,
      before.target_id ?? null,
    );
    TestValidator.equals(
      `${title} - created_at immutable`,
      after.created_at,
      originalNotification.created_at,
    );
  };

  const assertUpdatedAtNotBefore = (
    title: string,
    prev: ICommunityPlatformNotification,
    next: ICommunityPlatformNotification,
  ): void => {
    TestValidator.predicate(
      `${title} - updated_at is not earlier`,
      next.updated_at >= prev.updated_at,
    );
  };

  // 7. memberUser marks notification as read (is_read: true)
  const markReadBody = {
    is_read: true,
  } satisfies ICommunityPlatformNotification.IUpdate;

  const readNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.update(
      connection,
      {
        notificationId: originalNotification.id as string & tags.Format<"uuid">,
        body: markReadBody,
      },
    );
  typia.assert(readNotification);

  // Assertions for read state change
  TestValidator.equals(
    "is_read is set to true after marking read",
    readNotification.is_read,
    true,
  );
  assertImmutableFields("mark-read", originalNotification, readNotification);
  TestValidator.predicate(
    "read_at is set when marking read",
    readNotification.read_at !== null && readNotification.read_at !== undefined,
  );
  assertUpdatedAtNotBefore("mark-read", originalNotification, readNotification);

  // 8. memberUser marks notification as unread (is_read: false)
  const markUnreadBody = {
    is_read: false,
  } satisfies ICommunityPlatformNotification.IUpdate;

  const unreadNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.update(
      connection,
      {
        notificationId: originalNotification.id as string & tags.Format<"uuid">,
        body: markUnreadBody,
      },
    );
  typia.assert(unreadNotification);

  TestValidator.equals(
    "is_read is set to false after marking unread",
    unreadNotification.is_read,
    false,
  );
  assertImmutableFields("mark-unread", readNotification, unreadNotification);
  // read_at may be cleared or preserved; just ensure it's either equal or null
  TestValidator.predicate(
    "read_at either unchanged or cleared when marking unread",
    unreadNotification.read_at === null ||
      unreadNotification.read_at === readNotification.read_at,
  );
  assertUpdatedAtNotBefore("mark-unread", readNotification, unreadNotification);

  // 9. memberUser sends is_read: null (no-op semantics)
  const noopBody = {
    is_read: null,
  } satisfies ICommunityPlatformNotification.IUpdate;

  const noopNotification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.memberUser.notifications.update(
      connection,
      {
        notificationId: originalNotification.id as string & tags.Format<"uuid">,
        body: noopBody,
      },
    );
  typia.assert(noopNotification);

  // is_read and read_at must remain unchanged according to DTO docs
  TestValidator.equals(
    "no-op update keeps is_read unchanged",
    noopNotification.is_read,
    unreadNotification.is_read,
  );
  TestValidator.equals(
    "no-op update keeps read_at unchanged",
    noopNotification.read_at ?? null,
    unreadNotification.read_at ?? null,
  );
  assertImmutableFields("noop", unreadNotification, noopNotification);
  assertUpdatedAtNotBefore("noop", unreadNotification, noopNotification);
}
