import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";

export async function test_api_system_setting_erase_authorized_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminJoinBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "AdminPass123!",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://test.example.com/admin/login",
    referrer: "https://test.example.com/",
  } satisfies IShoppingMallAdmin.ILogin;
  const loggedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedAdmin);

  // 3. Create a system setting to be deleted
  const sysSettingCreateBody = {
    key: `config_${RandomGenerator.alphaNumeric(4)}`,
    value: RandomGenerator.alphaNumeric(12),
    description: "Temporary system setting for deletion test",
  } satisfies IShoppingMallSystemSetting.ICreate;

  const createdSysSetting: IShoppingMallSystemSetting =
    await api.functional.shoppingMall.admin.systemSettings.create(connection, {
      body: sysSettingCreateBody,
    });
  typia.assert(createdSysSetting);

  // 4. Delete the system setting by its UUID ID
  await api.functional.shoppingMall.admin.systemSettings.eraseSystemSetting(
    connection,
    { id: createdSysSetting.id },
  );

  // 5. Verify deletion by attempting to fetch deleted system setting
  // Since no fetch endpoint is given, we test deletion indirectly
  // For purpose of demonstrating validation, we test error is thrown if trying to delete again
  await TestValidator.error(
    "deleting already deleted system setting should fail",
    async () => {
      await api.functional.shoppingMall.admin.systemSettings.eraseSystemSetting(
        connection,
        { id: createdSysSetting.id },
      );
    },
  );
}
