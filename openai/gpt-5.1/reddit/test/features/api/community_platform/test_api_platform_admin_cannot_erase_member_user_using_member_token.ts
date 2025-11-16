import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Ensure memberUser tokens cannot be used to call platform-admin-only member
 * user erase endpoint.
 *
 * Business goal: This test validates that role-based access control is enforced
 * on the destructive DELETE
 * /communityPlatform/platformAdmin/memberUsers/{memberUserId} endpoint. Even if
 * a client is authenticated as a regular member user, they must not be able to
 * invoke platformAdmin-only delete operations.
 *
 * Scenario walkthrough:
 *
 * 1. Register a target member user (User A) using POST /auth/memberUser/join.
 *
 *    - Use typia.random<ICommunityPlatformMemberuser.IJoinRequest>() to build a
 *         valid join request body.
 *    - Capture the returned ICommunityPlatformMemberuser.IAuthorized.id as the
 *         member user id that will be the delete target.
 * 2. Register a second member user (User B) using POST /auth/memberUser/join.
 *
 *    - Again use typia.random<ICommunityPlatformMemberuser.IJoinRequest>() for the
 *         request body, but ensure the username/email differ from User A by
 *         generating a fresh random DTO.
 *    - Observe that join sets connection.headers.Authorization to User B’s access
 *         token, making the connection authenticated as a memberUser.
 * 3. While authenticated as User B, attempt to call the platform-admin-only erase
 *    endpoint:
 *
 *    - Call api.functional.communityPlatform.platformAdmin.memberUsers.erase with
 *         memberUserId set to User A’s id.
 *    - Because the Authorization header holds a memberUser token, the backend should
 *         reject this call as unauthorized/forbidden for the platformAdmin
 *         actor.
 * 4. Validate that the erase call fails due to insufficient privileges:
 *
 *    - Use TestValidator.error with a descriptive title to assert that the erase
 *         invocation throws an error (which should be an HTTP error from the
 *         SDK).
 *    - Do NOT assert on a specific status code (e.g., 403) to keep the test
 *         resilient to implementation details. Only the presence of an error is
 *         required.
 * 5. Optionally, confirming that User A still exists from a platformAdmin
 *    perspective would require additional read APIs that are not provided in
 *    this context, so this test focuses solely on authorization failure of the
 *    erase call.
 *
 * Technical constraints:
 *
 * - Use only the imported types/utilities: api, typia, RandomGenerator,
 *   TestValidator, and the DTO types.
 * - Do not add or modify import statements.
 * - Use `satisfies` for request bodies instead of type annotations or `as`.
 * - Do not touch connection.headers directly; rely on auth.join side-effects.
 */
export async function test_api_platform_admin_cannot_erase_member_user_using_member_token(
  connection: api.IConnection,
) {
  // 1. Register target member user (User A)
  const userAJoinBody =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();
  const userA = await api.functional.auth.memberUser.join(connection, {
    body: userAJoinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(userA);

  // 2. Register second member user (User B) and let its token occupy Authorization header
  const userBJoinBody =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();
  const userB = await api.functional.auth.memberUser.join(connection, {
    body: userBJoinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(userB);

  // Sanity check: ensure User A and User B are different accounts by id
  TestValidator.notEquals(
    "User A and User B must have different ids",
    userA.id,
    userB.id,
  );

  // 3. Attempt to erase User A using User B's memberUser token
  await TestValidator.error(
    "memberUser token must not be able to erase member user via platformAdmin endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.erase(
        connection,
        {
          memberUserId: userA.id,
        },
      );
    },
  );
}
