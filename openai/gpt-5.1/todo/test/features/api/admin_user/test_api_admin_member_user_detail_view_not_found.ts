import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Verify admin-only member user detail view behavior when the target member
 * user does not exist.
 *
 * Business goal
 *
 * - Ensure that the GET /todoApp/adminUser/memberUsers/{memberUserId} endpoint:
 *
 *   - Does not succeed when requested with a non-existent member user id, and
 *   - Is accessible only to authenticated admin users.
 *
 * Covered aspects
 *
 * 1. Admin registration and implicit authentication via /auth/adminUser/join
 * 2. Creation of at least one system setting as a realistic admin-only
 *    precondition
 * 3. Attempting to fetch a member user by an id that should not exist
 * 4. Verifying that the memberUsers.at call fails for a non-existent id
 * 5. Verifying that the same endpoint also fails when called without admin
 *    authentication
 *
 * Important constraints
 *
 * - We do not assert concrete HTTP status codes or error payload structures
 *   (e.g., 404 vs 401). Instead, we validate that the API throws an error for
 *   invalid/non-admin access.
 * - We do not interact with connection.headers beyond creating a cloned
 *   unauthenticated connection object for the second call.
 */
export async function test_api_admin_member_user_detail_view_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/onboarding" as string &
      tags.Format<"uri">,
    referrer: "https://admin.todoapp.test/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  // 2. Create a baseline system setting as this admin.
  const settingBody = {
    key: `max_active_todos_per_user_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingBody,
    });
  typia.assert<ITodoAppSystemSetting>(createdSetting);

  // 3. Generate a memberUserId that should not exist.
  const nonexistentMemberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. As authenticated admin, calling memberUsers.at with non-existent id
  //    must result in an error.
  await TestValidator.error(
    "admin fetches non-existent member user should fail",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.at(connection, {
        memberUserId: nonexistentMemberUserId,
      });
    },
  );

  // 5. Confirm the endpoint is protected by admin authentication by calling
  //    without Authorization header and expecting an error as well.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated fetch of member user detail should fail",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.at(unauthConnection, {
        memberUserId: nonexistentMemberUserId,
      });
    },
  );
}
