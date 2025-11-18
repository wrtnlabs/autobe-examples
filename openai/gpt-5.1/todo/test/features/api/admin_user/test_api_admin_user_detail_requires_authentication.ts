import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Verify that admin user detail endpoint enforces authentication and cannot be
 * accessed anonymously.
 *
 * Business context:
 *
 * - Admin users are privileged operators of the todoApp service.
 * - The detail endpoint GET /todoApp/adminUser/adminUsers/{adminUserId} returns
 *   sensitive information about administrative accounts and must not be exposed
 *   to unauthenticated callers.
 *
 * Test objectives:
 *
 * 1. Prove that an authenticated admin can successfully read their own detailed
 *    profile using the adminUsers.at endpoint.
 * 2. Prove that the same endpoint fails when called without any Authorization
 *    context, ensuring it is not publicly accessible.
 * 3. Execute a dependent systemSettings.create call under an authenticated admin
 *    context to align with environment expectations and make sure failures are
 *    due to missing auth rather than uninitialized configuration.
 *
 * High-level steps:
 *
 * 1. Register and authenticate an admin user via POST /auth/adminUser/join.
 * 2. Create a system setting via POST /todoApp/adminUser/systemSettings using the
 *    authenticated admin connection.
 * 3. Call GET /todoApp/adminUser/adminUsers/{adminUserId} with the authenticated
 *    connection and verify success and ID consistency.
 * 4. Create an unauthenticated connection clone without headers.
 * 5. Attempt to call GET /todoApp/adminUser/adminUsers/{adminUserId} using the
 *    unauthenticated connection and assert that the SDK call fails via
 *    TestValidator.error.
 */
export async function test_api_admin_user_detail_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(1),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/register",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a system setting using the authenticated admin connection.
  const settingBody = {
    key: `max_todos_per_user_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingBody,
    });
  typia.assert(systemSetting);

  // 3. Baseline: authenticated admin user detail fetch should succeed.
  const authedDetail: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.at(connection, {
      adminUserId: authorized.id,
    });
  typia.assert(authedDetail);

  TestValidator.equals(
    "authenticated admin detail returns the same admin id",
    authedDetail.id,
    authorized.id,
  );

  // 4. Build an unauthenticated connection clone with empty headers.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Unauthorized access: calling detail endpoint without auth must fail.
  await TestValidator.error(
    "admin user detail endpoint should reject unauthenticated access",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.at(unauthConnection, {
        adminUserId: authorized.id,
      });
    },
  );
}
