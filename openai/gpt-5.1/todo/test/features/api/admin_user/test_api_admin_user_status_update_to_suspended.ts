import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_admin_user_status_update_to_suspended(
  connection: api.IConnection,
) {
  // 1. Register Admin A (policy-controlling admin) and authenticate
  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminAPassword: string & tags.Format<"password"> =
    "AdminA!234" as string & tags.Format<"password">;

  const adminAJoinBody = {
    email: adminAEmail,
    password: adminAPassword,
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
  typia.assert(adminA);

  // 2. As Admin A, create a system setting that could represent status policy
  const systemSettingBody = {
    key: "admin_status_policy",
    value: "active,suspended,disabled",
    type: "string",
    description: "Allowed admin status values and transitions",
    group: "admin_policies",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  TestValidator.equals(
    "created system setting key should match request",
    systemSetting.key,
    systemSettingBody.key,
  );

  // 3. Still as Admin A, register Admin B as an active admin
  const adminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminBPassword: string & tags.Format<"password"> =
    "AdminB!234" as string & tags.Format<"password">;

  const adminBJoinBody = {
    email: adminBEmail,
    password: adminBPassword,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminBAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuthorized);

  TestValidator.equals(
    "Admin B initial status is active",
    adminBAuthorized.status,
    "active",
  );

  const originalUpdatedAt: string & tags.Format<"date-time"> =
    adminBAuthorized.updated_at;

  // 3-1. Re-login as Admin A so that subsequent status update is performed
  // under Admin A's authenticated context (policy-controlling admin).
  const adminALoginBody = {
    email: adminAEmail,
    password: adminAPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminALogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminALogin);

  TestValidator.equals(
    "Admin A login id should match join id",
    adminALogin.id,
    adminA.id,
  );

  // 4. As Admin A, change Admin B's status to suspended via the status endpoint
  const updateStatusBody = {
    status: "suspended",
    reason: "Policy violation for testing suspension",
  } satisfies ITodoAppAdminUser.IUpdateStatus;

  const updatedAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.status.updateStatus(
      connection,
      {
        adminUserId: adminBAuthorized.id,
        body: updateStatusBody,
      },
    );
  typia.assert(updatedAdminB);

  // 5. Assert basic fields on the updated admin record
  TestValidator.equals(
    "updated admin user id should stay the same",
    updatedAdminB.id,
    adminBAuthorized.id,
  );

  TestValidator.equals(
    "updated admin user status should be suspended",
    updatedAdminB.status,
    updateStatusBody.status,
  );

  TestValidator.notEquals(
    "updated_at should change after status update",
    updatedAdminB.updated_at,
    originalUpdatedAt,
  );

  // 6. Attempt to log in as Admin B after suspension; login must be rejected
  await TestValidator.error("suspended admin cannot log in", async () => {
    const loginBody = {
      email: adminBEmail,
      password: adminBPassword,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies ITodoAppAdminUser.ILogin;

    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
  });
}
