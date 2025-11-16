import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Verify that attempting to delete a non-existent aggregated user karma record
 * as an authenticated admin user results in a not-found style HTTP error,
 * without damaging the surrounding authentication and admin data flows.
 *
 * Business context:
 *
 * - Admin users manage aggregate karma data via
 *   `/communityPlatform/adminUser/userKarmas/{userKarmaId}`.
 * - When an admin attempts to delete a user karma aggregate that does not exist,
 *   the service must return a not-found style error rather than silently
 *   succeeding or causing broader system issues.
 * - Even after such a failed deletion attempt, core admin authentication
 *   operations must continue to function normally.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin user via POST /auth/adminUser/join.
 *
 *    - Use a randomly generated but structurally valid join request body.
 *    - Validate the authorized admin response shape.
 * 2. Generate a random UUID value for `userKarmaId` that is treated as
 *    non-existent in `community_platform_user_karmas`.
 * 3. Call DELETE /communityPlatform/adminUser/userKarmas/{userKarmaId} with this
 *    non-existent identifier while authenticated as the admin user.
 *
 *    - Assert that the call results in an HttpError with a 404 not-found status
 *         using TestValidator.httpError.
 * 4. Register a second admin user via /auth/adminUser/join to ensure the system
 *    remains healthy after the failed deletion attempt.
 *
 *    - Validate the second authorized admin response.
 * 5. Cross-check that the two admin identities are distinct (different ids,
 *    usernames, and emails), confirming that normal admin creation flows still
 *    operate correctly and were not affected by the failed delete.
 */
export async function test_api_admin_user_karma_delete_nonexistent_record(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the first admin user
  const adminJoinBody1 =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const firstAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody1,
    });
  typia.assert(firstAdmin);

  // 2. Generate a random UUID to represent a non-existent user karma id
  const nonExistentUserKarmaId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete the non-existent user karma and assert not-found error
  await TestValidator.httpError(
    "delete non-existent user karma should return not-found error",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.userKarmas.erase(
        connection,
        {
          userKarmaId: nonExistentUserKarmaId,
        },
      );
    },
  );

  // 4. Register a second admin user to verify system stability
  const adminJoinBody2 =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const secondAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody2,
    });
  typia.assert(secondAdmin);

  // 5. Cross-check that the two admin identities are distinct
  TestValidator.notEquals(
    "second admin id should differ from first",
    firstAdmin.id,
    secondAdmin.id,
  );

  TestValidator.notEquals(
    "second admin username should differ from first",
    firstAdmin.username,
    secondAdmin.username,
  );

  TestValidator.notEquals(
    "second admin email should differ from first",
    firstAdmin.email,
    secondAdmin.email,
  );
}
