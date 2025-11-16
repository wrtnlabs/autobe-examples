import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Ensure platform admin cannot erase a member user without authentication.
 *
 * Business goal:
 *
 * - Verify that the destructive admin-only endpoint DELETE
 *   /communityPlatform/platformAdmin/memberUsers/{memberUserId} is protected
 *   from unauthenticated access.
 * - A caller without a valid platformAdmin Authorization context must not be able
 *   to delete a member user account, even when providing a real member user
 *   ID.
 *
 * Scenario steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join and capture the
 *    returned member user id.
 * 2. Prepare an unauthenticated connection object by shallow-cloning the provided
 *    `connection` but overriding `headers` with an empty object.
 * 3. Using the unauthenticated connection, attempt to invoke
 *    api.functional.communityPlatform.platformAdmin.memberUsers.erase with the
 *    real member user id.
 * 4. Assert that the erase call fails by throwing an error using
 *    TestValidator.error, without asserting a specific HTTP status code.
 *
 * Notes and constraints:
 *
 * - Do not touch or inspect `connection.headers` directly, except when creating a
 *   separate unauthenticated connection object with `headers: {}` during
 *   cloning.
 * - Use typia.random to generate a valid
 *   ICommunityPlatformMemberuser.IJoinRequest payload, ensuring it satisfies
 *   email/URI formatting constraints.
 * - The test focuses exclusively on the unauthenticated case; invalid or expired
 *   tokens are not simulated here because direct token/header manipulation is
 *   outside the allowed patterns for tests.
 */
export async function test_api_platform_admin_cannot_erase_member_user_without_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain a real memberUserId.
  const joinRequest: ICommunityPlatformMemberuser.IJoinRequest =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(memberAuthorized);

  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Prepare an unauthenticated connection with empty headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt to erase the member user using the unauthenticated connection.
  await TestValidator.error(
    "platform admin erase must fail without authentication",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.erase(
        unauthenticatedConnection,
        {
          memberUserId,
        },
      );
    },
  );
}
