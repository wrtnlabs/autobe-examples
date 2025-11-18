import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate that deleting an administrative user requires proper authentication.
 *
 * Business goal:
 *
 * - Ensure that destructive admin operations, such as permanently deleting a
 *   todo_app_adminusers row, cannot be invoked by anonymous or unauthenticated
 *   clients, even when system settings are present.
 * - Confirm that system settings creation itself is also protected by adminUser
 *   authentication.
 *
 * Test steps:
 *
 * 1. Create an "anonymous" connection by cloning the given connection with empty
 *    headers, then attempt to call POST /todoApp/adminUser/systemSettings using
 *    that connection. This should fail with an HTTP authorization error (401 or
 *    403) because only authenticated adminUser actors may manage system
 *    settings.
 * 2. Call POST /auth/adminUser/join to register Admin A. This creates an admin
 *    account and, via the SDK, configures the connection with a valid
 *    Authorization header for the adminUser actor. Assert the returned
 *    ITodoAppAdminUser.IAuthorized payload.
 * 3. Using the authenticated connection (Admin A), call POST
 *    /todoApp/adminUser/systemSettings with a valid
 *    ITodoAppSystemSetting.ICreate body and assert the created
 *    ITodoAppSystemSetting response to verify that authorized admins can manage
 *    system settings successfully.
 * 4. Still on the same connection, call POST /auth/adminUser/join again to
 *    register Admin B and capture the returned id from
 *    ITodoAppAdminUser.IAuthorized. This id will be the deletion target.
 * 5. Construct another unauthenticated connection (headers: {}), then attempt to
 *    delete Admin B by calling DELETE
 *    /todoApp/adminUser/adminUsers/{adminUserId} with Admin B's id. Use
 *    TestValidator.httpError to assert that this operation fails with an HTTP
 *    error status of 401 or 403, proving that anonymous or improperly
 *    authenticated clients cannot perform irreversible admin deletions.
 *
 * Under current API surface, there is no admin-user GET or search endpoint
 * available to verify persistence of Admin B after the failed delete. The test
 * therefore focuses on verifying that the unauthorized erase attempt results in
 * an authentication/authorization error, which is sufficient to validate the
 * enforcement of authentication for this destructive operation.
 */
export async function test_api_admin_user_delete_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Try to create system settings without authentication
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "creating system settings without auth must fail",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.create(
        anonymousConnection,
        {
          body: {
            key: RandomGenerator.alphabets(10),
            value: "100",
            type: "int",
            description: RandomGenerator.paragraph({ sentences: 3 }),
            group: "limits",
            enabled: true,
          } satisfies ITodoAppSystemSetting.ICreate,
        },
      );
    },
  );

  // 2. Join as Admin A (this will authenticate and set Authorization header)
  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        status: "active",
        ip: "127.0.0.1",
        href: "https://admin.todo-app.test/join",
        referrer: "https://admin.todo-app.test/landing",
      } satisfies ITodoAppAdminUser.IJoin,
    });
  typia.assert(adminA);

  // 3. As Admin A, successfully create a system setting
  const setting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: {
        key: RandomGenerator.alphabets(12),
        value: "50",
        type: "int",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        group: "limits",
        enabled: true,
      } satisfies ITodoAppSystemSetting.ICreate,
    });
  typia.assert(setting);

  // 4. As Admin A, register Admin B, capturing id
  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        status: "active",
        ip: "127.0.0.1",
        href: "https://admin.todo-app.test/join",
        referrer: "https://admin.todo-app.test/landing",
      } satisfies ITodoAppAdminUser.IJoin,
    });
  typia.assert(adminB);

  // 5. Attempt to delete Admin B without authentication (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated delete of admin user must fail",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.erase(
        unauthenticatedConnection,
        {
          adminUserId: adminB.id,
        },
      );
    },
  );
}
