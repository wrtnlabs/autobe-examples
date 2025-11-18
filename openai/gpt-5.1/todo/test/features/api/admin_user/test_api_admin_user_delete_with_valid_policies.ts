import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_admin_user_delete_with_valid_policies(
  connection: api.IConnection,
) {
  // 1. Register Admin B (target admin to be deleted later)
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
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  const adminBId = adminB.id;

  // 2. Register Admin A (acting administrator who will configure settings and delete Admin B)
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

  // At this point, connection is authenticated as Admin A.

  // 3. Create required system setting as Admin A to represent policies enabling admin deletion
  const settingKey = "enable_admin_delete";
  const systemSettingCreateBody = {
    key: settingKey,
    value: "true",
    type: "boolean",
    description: "Enable destructive admin user deletion",
    group: "admin_policies",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert(createdSetting);

  TestValidator.equals(
    "created system setting key must match input key",
    createdSetting.key,
    settingKey,
  );

  // 4. Perform deletion of Admin B as Admin A
  await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
    adminUserId: adminBId,
  });

  // 5. Verify that attempting to delete Admin B again fails, proving irreversible deletion
  await TestValidator.error(
    "cannot delete an already removed admin user",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.erase(connection, {
        adminUserId: adminBId,
      });
    },
  );

  // 6. Verify Admin A remains functional by creating another system setting after deletion
  const secondSettingKey =
    "post_delete_admin_setting_" + RandomGenerator.alphaNumeric(8);

  const secondSettingCreateBody = {
    key: secondSettingKey,
    value: "1",
    type: "int",
    description:
      "A setting created after deleting another admin to confirm Admin A still works",
    group: "admin_policies",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const secondSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: secondSettingCreateBody,
    });
  typia.assert(secondSetting);

  TestValidator.equals(
    "second system setting key must match input key",
    secondSetting.key,
    secondSettingKey,
  );
}
