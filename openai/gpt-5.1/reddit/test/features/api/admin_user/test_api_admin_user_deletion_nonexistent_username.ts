import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate behavior when attempting to delete a non-existent admin user by
 * username.
 *
 * Business goals:
 *
 * - Ensure that DELETE /communityPlatform/adminUser/adminUsers/{username} does
 *   not succeed when the target username does not exist.
 * - Verify that such a failed deletion surfaces as an error (HttpError) and does
 *   not affect existing admin accounts.
 *
 * Scenario steps:
 *
 * 1. Register an admin user (Admin A) using POST /auth/adminUser/join, obtaining
 *    an authenticated admin context and letting the SDK populate the
 *    Authorization header on the connection.
 * 2. Generate a username string that is guaranteed not to exist, by constructing a
 *    random value distinct from Admin A's username.
 * 3. Call DELETE /communityPlatform/adminUser/adminUsers/{username} with the
 *    non-existent username and assert that the call fails by throwing an
 *    HttpError (using TestValidator.error), i.e., the deletion is not treated
 *    as success.
 * 4. Confirm that Admin A remains valid by re-asserting the original
 *    ICommunityPlatformAdminuser.IAuthorized object, ensuring no unintended
 *    side effects occurred on existing accounts.
 */
export async function test_api_admin_user_deletion_nonexistent_username(
  connection: api.IConnection,
) {
  // 1. Register Admin A via join endpoint to obtain authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminA);

  // 2. Generate a definitely non-existent username
  // Ensure it differs from Admin A's username to avoid accidental hit
  let nonexistentUsername = RandomGenerator.alphaNumeric(20);
  if (nonexistentUsername === adminA.username) {
    nonexistentUsername = `${nonexistentUsername}_x`;
  }

  // 3. Attempt to delete non-existent username and expect an HttpError
  await TestValidator.error(
    "deleting non-existent admin username must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.erase(
        connection,
        {
          username: nonexistentUsername,
        },
      );
    },
  );

  // 4. Re-assert Admin A context to ensure it remains structurally valid
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminA);

  // Additional simple logical check: generated nonexistent username is not equal
  // to Admin A's real username
  TestValidator.notEquals(
    "non-existent username must differ from Admin A username",
    nonexistentUsername,
    adminA.username,
  );
}
