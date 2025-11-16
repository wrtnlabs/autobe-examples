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
 * Verify that mark-all-read notifications endpoint enforces memberUser-only
 * authentication and that a properly authenticated member can successfully
 * execute it.
 *
 * Business goals:
 *
 * - Unauthenticated callers cannot mark notifications as read.
 * - Admin users (adminUser actor) cannot call the member-only endpoint.
 * - A valid memberUser with existing notifications can call markAllRead without
 *   error.
 *
 * Flow:
 *
 * 1. Prepare an unauthenticated connection and confirm that calling
 *    api.functional.communityPlatform.memberUser.notifications.markAllRead
 *    fails.
 * 2. Join an adminUser account and rely on SDK to set admin Authorization header.
 * 3. Join a memberUser account on the same connection to obtain a valid member id,
 *    but note that SDK now overwrites Authorization header with the member
 *    token.
 * 4. Log back in as adminUser to restore admin Authorization header on the
 *    connection.
 * 5. As adminUser, create a notification targeting the memberUser id so that there
 *    is at least one notification row for that member.
 * 6. Attempt to call markAllRead while authenticated as adminUser and assert that
 *    the operation fails (admin token must not be accepted for member-only
 *    API).
 * 7. Log in as the memberUser to switch Authorization header to the member token.
 * 8. Call markAllRead as the memberUser and assert that it does not throw.
 */
export async function test_api_notifications_mark_all_read_requires_member_auth(
  connection: api.IConnection,
) {
  // 1. Unauthenticated connection should be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated markAllRead should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.notifications.markAllRead(
        unauthConn,
      );
    },
  );

  // 2. Join adminUser (SDK will set admin Authorization on base connection)
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 3. Join memberUser on same connection (Authorization becomes member token)
  const memberUsername = RandomGenerator.name(1);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const memberPassword = "P@ssw0rd!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberId = memberAuthorizedFromJoin.id;

  // 4. Log back in as adminUser (switch Authorization to admin token again)
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 5. As adminUser, create a notification targeting the memberUser
  const notificationCreateBody = {
    community_platform_memberuser_id: memberId,
    category: "system",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 5 }),
    target_type: null,
    target_id: null,
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

  // 6. Admin-authenticated call to markAllRead must fail
  await TestValidator.error(
    "admin-authenticated markAllRead should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.notifications.markAllRead(
        connection,
      );
    },
  );

  // 7. Log in as the memberUser to obtain member Authorization on the connection
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 8. Member-authenticated call to markAllRead should succeed
  await api.functional.communityPlatform.memberUser.notifications.markAllRead(
    connection,
  );

  // If we reach here, the positive path has succeeded
  TestValidator.predicate(
    "member markAllRead completed without throwing",
    true,
  );
}
