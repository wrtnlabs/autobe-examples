import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate that an authenticated admin user can invoke the self session erase
 * endpoint and that unauthenticated callers are rejected.
 *
 * Business focus:
 *
 * - Ensure an admin can call DELETE
 *   /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId} while
 *   authenticated.
 * - Confirm that after attempting to erase a session, the admin can still perform
 *   other privileged operations (system settings creation) using the remaining
 *   valid session.
 * - Verify that unauthenticated connections cannot call the erase endpoint.
 *
 * Scenario steps:
 *
 * 1. Register a new admin account via /auth/adminUser/join (creates session A).
 * 2. Log in as the same admin via /auth/adminUser/login (creates session B).
 * 3. Create a system setting using the authenticated admin context.
 * 4. Call the erase endpoint with the admin's id and a UUID session id.
 * 5. Verify that the call succeeds and that admin operations still work afterward
 *    by creating another system setting.
 * 6. Using an unauthenticated connection, attempt to call erase again and expect
 *    an error.
 */
export async function test_api_admin_session_erase_self_session(
  connection: api.IConnection,
) {
  // 1. Register a new admin user (session A is created implicitly)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/join",
    referrer: "https://landing.todoapp.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const joinedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  const adminUserId: string & tags.Format<"uuid"> = joinedAdmin.id;

  // 2. Log in as the same admin (session B)
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/login",
    referrer: "https://admin.todoapp.test/join",
  } satisfies ITodoAppAdminUser.ILogin;

  const loggedInAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "login should return same admin id as join",
    loggedInAdmin.id,
    adminUserId,
  );

  // 3. Create an initial system setting to ensure admin environment works
  const firstSettingBody = {
    key: `max_todos_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const firstSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: firstSettingBody,
    });
  typia.assert(firstSetting);

  TestValidator.equals(
    "first system setting key matches request",
    firstSetting.key,
    firstSettingBody.key,
  );

  // 4. Call erase on a session id for this admin
  const targetSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  let eraseReached = false;
  await api.functional.todoApp.adminUser.adminUsers.sessions.erase(connection, {
    adminUserId,
    sessionId: targetSessionId,
  });
  eraseReached = true;

  TestValidator.predicate(
    "erase should complete without throwing in authenticated context",
    eraseReached,
  );

  // 5. Verify that admin operations still work after erase by creating
  //    another system setting with the current authenticated context.
  const secondSettingBody = {
    key: `feature_flag_${RandomGenerator.alphaNumeric(8)}`,
    value: "true",
    type: "boolean",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const secondSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: secondSettingBody,
    });
  typia.assert(secondSetting);

  TestValidator.equals(
    "second system setting key matches request",
    secondSetting.key,
    secondSettingBody.key,
  );

  // 6. Negative scenario: unauthenticated client cannot erase sessions
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated erase should fail", async () => {
    await api.functional.todoApp.adminUser.adminUsers.sessions.erase(
      unauthenticatedConnection,
      {
        adminUserId,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
