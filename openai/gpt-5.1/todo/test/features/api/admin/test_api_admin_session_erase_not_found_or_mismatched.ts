import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_admin_session_erase_not_found_or_mismatched(
  connection: api.IConnection,
) {
  // 1. Register Admin A and obtain authorized context
  const adminAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminA);

  // 2. Optionally log in Admin A again to simulate multiple sessions (not strictly required)
  const adminALoginBody = {
    email: adminA.email,
    password: adminAJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-ref",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminALogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminALogin);

  // Ensure we’re using the latest Admin A identity consistently
  TestValidator.equals(
    "Admin A id from join and login should match",
    adminA.id,
    adminALogin.id,
  );

  const adminUserIdA = adminA.id;

  // 3. Register Admin B and obtain authorized context
  const adminBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminB);

  const adminUserIdB = adminB.id;

  TestValidator.notEquals(
    "Admin A and Admin B must be distinct admins",
    adminUserIdA,
    adminUserIdB,
  );

  // At this point, connection headers contain Admin B token
  // Switch back to Admin A by logging in again as Admin A
  const adminALoginAgain: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALoginBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminALoginAgain);

  // 4. While authenticated as Admin A, initialize a system setting to prove valid admin context
  const systemSettingCreateBody = {
    key: `max_active_todos_${RandomGenerator.alphabets(6)}`,
    value: "100",
    type: "int",
    description: "Max active todos per user for test scenario",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert<ITodoAppSystemSetting>(createdSetting);

  TestValidator.equals(
    "Created system setting key should match request",
    createdSetting.key,
    systemSettingCreateBody.key,
  );

  // 5. Case 1: Attempt to delete a non-existent session for Admin A
  const randomSessionIdNonexistent = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "Deleting a non-existent session for Admin A should fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.erase(
        connection,
        {
          adminUserId: adminUserIdA,
          sessionId: randomSessionIdNonexistent,
        },
      );
    },
  );

  // 6. Case 2: Attempt to delete a session that (conceptually) belongs to another admin
  // We cannot access real session IDs, but we can still verify that arbitrary UUIDs
  // not associated with Admin A are rejected.
  const randomSessionIdMismatched = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "Deleting a mismatched admin/session pair for Admin A should fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.erase(
        connection,
        {
          adminUserId: adminUserIdA,
          sessionId: randomSessionIdMismatched,
        },
      );
    },
  );

  // 7. After failed deletions, verify Admin A can still perform admin-only operations
  const postFailureSettingBody = {
    key: `post_failure_setting_${RandomGenerator.alphabets(6)}`,
    value: "1",
    type: "int",
    description: "Setting created after failed session deletions",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const postFailureSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: postFailureSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(postFailureSetting);

  TestValidator.equals(
    "Post-failure system setting key should match request",
    postFailureSetting.key,
    postFailureSettingBody.key,
  );
}
