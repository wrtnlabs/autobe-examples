import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformLoginAttempt";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that non-admin actors cannot access admin-only login attempt
 * details.
 *
 * Business goal
 *
 * - Ensure that the admin-only endpoint for reading a single login attempt record
 *   is protected so that only adminUser actors can reach it.
 * - MemberUser actors (regular community members) and unauthenticated guests must
 *   both be denied access.
 *
 * High level steps
 *
 * 1. Register a new memberUser account so we have a valid non-admin JWT.
 * 2. While authenticated as memberUser, call the admin-only GET
 *    /communityPlatform/adminUser/loginAttempts/{loginAttemptId} endpoint with
 *    an arbitrary UUID and assert that the call fails.
 * 3. Build a fresh unauthenticated connection (empty headers) and call the same
 *    endpoint again, asserting that a guest caller is also rejected.
 * 4. Never successfully obtain an ICommunityPlatformLoginAttempt instance from
 *    this endpoint in this test.
 */
export async function test_api_admin_login_attempt_access_control_forbidden_to_non_admin(
  connection: api.IConnection,
) {
  // 1. Register a memberUser to get a non-admin Authorization token on connection
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As memberUser, attempt to call the admin loginAttempt detail endpoint
  const memberScopedLoginAttemptId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "memberUser cannot access admin loginAttempts detail endpoint",
    async () => {
      // Even if an ID does not exist, we only care that access is denied
      await api.functional.communityPlatform.adminUser.loginAttempts.at(
        connection,
        {
          loginAttemptId: memberScopedLoginAttemptId,
        },
      );
    },
  );

  // 3. Build an unauthenticated connection with empty headers
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. As guest (no Authorization header), call the same endpoint and expect error
  const guestLoginAttemptId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "guest cannot access admin loginAttempts detail endpoint",
    async () => {
      await api.functional.communityPlatform.adminUser.loginAttempts.at(
        guestConnection,
        {
          loginAttemptId: guestLoginAttemptId,
        },
      );
    },
  );
}
