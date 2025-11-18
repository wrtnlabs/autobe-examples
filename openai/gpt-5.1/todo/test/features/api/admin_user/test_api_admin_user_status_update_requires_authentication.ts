import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_admin_user_status_update_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection clone with empty headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 2. Attempt to update status without authentication and expect an error
  await TestValidator.error(
    "unauthenticated admin status update must fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.status.updateStatus(
        unauthConnection,
        {
          adminUserId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "suspended",
          } satisfies ITodoAppAdminUser.IUpdateStatus,
        },
      );
    },
  );

  // 3. Register Admin A via /auth/adminUser/join (this will also set Authorization header)
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // Preserve Admin A's authenticated connection for later use
  const adminAConnection: api.IConnection = { ...connection };

  // 4. As Admin A, create a system setting that could govern status transitions
  const settingCreateBody = {
    key: "admin_status_allowed_transitions",
    value: "active,suspended,disabled",
    type: "string",
    description: "Allowed admin status values for transitions",
    group: "adminUser",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(
      adminAConnection,
      {
        body: settingCreateBody,
      },
    );
  typia.assert(systemSetting);
  TestValidator.equals(
    "system setting key must match",
    systemSetting.key,
    settingCreateBody.key,
  );

  // 5. Create Admin B via another join call, using a fresh base connection clone
  const baseConnectionForAdminB: api.IConnection = { ...connection };
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(baseConnectionForAdminB, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // 6. As Admin A (using preserved connection), update Admin B's status to suspended
  const updateBody = {
    status: "suspended",
    reason: "Security review",
  } satisfies ITodoAppAdminUser.IUpdateStatus;

  const updatedAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.status.updateStatus(
      adminAConnection,
      {
        adminUserId: adminB.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAdminB);

  // 7. Validate that the correct admin user was updated and status changed as expected
  TestValidator.equals(
    "updated admin user id must match Admin B id",
    updatedAdminB.id,
    adminB.id,
  );
  TestValidator.equals(
    "admin status must be updated to suspended",
    updatedAdminB.status,
    updateBody.status,
  );

  // 8. Sanity checks that Admin A and Admin B are distinct accounts
  TestValidator.notEquals(
    "Admin A and Admin B must be distinct accounts",
    adminA.id,
    adminB.id,
  );
}
