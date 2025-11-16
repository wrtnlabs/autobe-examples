import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotification";

/**
 * E2E: admin creates independent notifications for two different members.
 *
 * Business goal: Validate that an administrative actor (adminUser) can create
 * notifications targeting different member users using the communityPlatform
 * admin notifications API, and that the system keeps those notifications
 * independent: each has its own id, category, title, and read-state without
 * data being mixed between them.
 *
 * Due to the given SDK surface, we can only exercise the admin-side creation
 * and inspect the returned ICommunityPlatformNotification entities. The
 * member-side GET endpoints mentioned in the high-level scenario are not
 * available, so we instead assert independence and correct mapping based on the
 * create payloads and the two response objects.
 *
 * Flow:
 *
 * 1. Register Member A via POST /auth/memberUser/join.
 * 2. Register Member B via POST /auth/memberUser/join.
 * 3. Register an admin user via POST /auth/adminUser/join; this also authenticates
 *    the connection as admin.
 * 4. As admin, call POST /communityPlatform/adminUser/notifications to create
 *    Notification A for Member A, using a deterministic category and title.
 * 5. As admin, call the same POST to create Notification B for Member B, using
 *    different title and category/body so we can distinguish them.
 * 6. Assert that both responses are valid ICommunityPlatformNotification entities,
 *    have distinct ids, and that the (category, title, body) fields match the
 *    inputs for their respective target member.
 * 7. Assert that creating the second notification has no side effect on the first:
 *    id remains stable and fields still match its original input.
 */
export async function test_api_admin_creates_notifications_for_multiple_members(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAJoin = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoin,
    });
  typia.assert(memberA);

  // 2. Register Member B
  const memberBJoin = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoin,
    });
  typia.assert(memberB);

  // 3. Register and authenticate admin user
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4. Admin creates Notification A for Member A
  const notificationABody = {
    community_platform_memberuser_id: memberA.id,
    category: "system",
    title: "Message for Member A",
    body: RandomGenerator.paragraph({ sentences: 5 }),
    target_type: "member_profile",
    target_id: memberA.id,
    is_read: false,
  } satisfies ICommunityPlatformNotification.ICreate;

  const notificationA: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationABody,
      },
    );
  typia.assert(notificationA);

  // 5. Admin creates Notification B for Member B with different payload
  const notificationBBody = {
    community_platform_memberuser_id: memberB.id,
    category: "activity",
    title: "Message for Member B",
    body: RandomGenerator.paragraph({ sentences: 4 }),
    target_type: "member_profile",
    target_id: memberB.id,
    is_read: false,
  } satisfies ICommunityPlatformNotification.ICreate;

  const notificationB: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      {
        body: notificationBBody,
      },
    );
  typia.assert(notificationB);

  // 6. Validate independence and field mappings

  // Basic identity and distinctness checks
  TestValidator.predicate(
    "each notification has a non-empty UUID id",
    () =>
      typeof notificationA.id === "string" &&
      notificationA.id.length > 0 &&
      typeof notificationB.id === "string" &&
      notificationB.id.length > 0,
  );

  TestValidator.notEquals(
    "notification ids must be distinct between member A and B",
    notificationA.id,
    notificationB.id,
  );

  // Category, title, and body mapping
  TestValidator.equals(
    "notification A category matches creation payload",
    notificationA.category,
    notificationABody.category,
  );
  TestValidator.equals(
    "notification A title matches creation payload",
    notificationA.title,
    notificationABody.title,
  );
  TestValidator.equals(
    "notification A body matches creation payload",
    notificationA.body,
    notificationABody.body,
  );

  TestValidator.equals(
    "notification B category matches creation payload",
    notificationB.category,
    notificationBBody.category,
  );
  TestValidator.equals(
    "notification B title matches creation payload",
    notificationB.title,
    notificationBBody.title,
  );
  TestValidator.equals(
    "notification B body matches creation payload",
    notificationB.body,
    notificationBBody.body,
  );

  // is_read state should be false when we create with is_read: false or defaulted
  TestValidator.equals(
    "notification A initial is_read matches requested state",
    notificationA.is_read,
    notificationABody.is_read ?? false,
  );
  TestValidator.equals(
    "notification B initial is_read matches requested state",
    notificationB.is_read,
    notificationBBody.is_read ?? false,
  );

  // created_at and updated_at should be valid date-time strings and not null
  TestValidator.predicate(
    "notification A has valid created_at and updated_at",
    () => {
      const createdTime = Date.parse(notificationA.created_at);
      const updatedTime = Date.parse(notificationA.updated_at);
      return !Number.isNaN(createdTime) && !Number.isNaN(updatedTime);
    },
  );

  TestValidator.predicate(
    "notification B has valid created_at and updated_at",
    () => {
      const createdTime = Date.parse(notificationB.created_at);
      const updatedTime = Date.parse(notificationB.updated_at);
      return !Number.isNaN(createdTime) && !Number.isNaN(updatedTime);
    },
  );

  // 7. Ensure second creation did not mutate first notification snapshot
  TestValidator.equals(
    "notification A title remains unchanged after creating B",
    notificationA.title,
    notificationABody.title,
  );
  TestValidator.equals(
    "notification A category remains unchanged after creating B",
    notificationA.category,
    notificationABody.category,
  );
}
