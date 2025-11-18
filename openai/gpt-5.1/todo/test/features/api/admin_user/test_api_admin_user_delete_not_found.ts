import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate behavior when deleting a non-existent admin user.
 *
 * Business intent:
 *
 * - Ensure that DELETE /todoApp/adminUser/adminUsers/{adminUserId} reports an
 *   error when the target admin user id does not exist.
 * - Confirm that such a failing deletion does not break the admin authentication
 *   / account system (no unintended side effects).
 *
 * Test flow:
 *
 * 1. Bootstrap an admin context by calling POST /auth/adminUser/join with a
 *    randomized email/password payload. This also sets the Authorization header
 *    on the shared connection via the SDK.
 * 2. Generate a random UUID string to use as a fake adminUserId, which we assume
 *    does not correspond to any real todo_app_adminusers record.
 * 3. Call api.functional.todoApp.adminUser.adminUsers.erase with that random
 *    adminUserId while authenticated as the created admin.
 * 4. Assert that an error is thrown using TestValidator.error. To comply with
 *    global rules, we do not assert on the concrete HTTP status code or error
 *    payload; we only require that the operation fails.
 * 5. As a lightweight regression check for "no side effects", call
 *    api.functional.auth.adminUser.join again with a new random email while
 *    still using the same connection and assert that it returns a valid
 *    ITodoAppAdminUser.IAuthorized via typia.assert(). If this second join
 *    succeeds, it strongly suggests that the failed deletion attempt did not
 *    corrupt global admin state.
 */
export async function test_api_admin_user_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Create an initial admin user to obtain admin authentication context
  const firstAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const firstAdmin = await api.functional.auth.adminUser.join(connection, {
    body: firstAdminJoinBody,
  });
  typia.assert(firstAdmin);

  // 2. Generate a random UUID for a non-existent admin user id
  const nonExistentAdminUserId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete the non-existent admin user and assert that it fails
  await TestValidator.error(
    "delete non-existent admin user should fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
        adminUserId: nonExistentAdminUserId,
      });
    },
  );

  // 4. Verify no side effects by performing another successful admin join
  const secondAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const secondAdmin = await api.functional.auth.adminUser.join(connection, {
    body: secondAdminJoinBody,
  });
  typia.assert(secondAdmin);
}
