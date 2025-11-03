import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";

/**
 * Test updating an existing system setting by an admin user.
 *
 * This test follows these steps:
 *
 * 1. Authenticate as an admin user by joining via /auth/admin/join with valid
 *    credentials.
 * 2. Create a new system setting via /shoppingMall/admin/systemSettings to have an
 *    existing setting.
 * 3. Update the created system setting with new key, value, and description via
 *    /shoppingMall/admin/systemSettings/{id}.
 * 4. Verify that the updated system setting's key, value, and description reflect
 *    the updated data.
 */
export async function test_api_system_setting_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const adminPassword = "admin1234";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a new system setting
  const createBody = {
    key: `testKey_${RandomGenerator.alphaNumeric(5)}`,
    value: `testValue_${RandomGenerator.alphaNumeric(5)}`,
    description: `description_${RandomGenerator.alphaNumeric(10)}`,
  } satisfies IShoppingMallSystemSetting.ICreate;

  const setting: IShoppingMallSystemSetting =
    await api.functional.shoppingMall.admin.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(setting);

  // Step 3: Update the system setting
  const updateBody = {
    key: `updatedKey_${RandomGenerator.alphaNumeric(5)}`,
    value: `updatedValue_${RandomGenerator.alphaNumeric(5)}`,
    description: `updatedDescription_${RandomGenerator.alphaNumeric(10)}`,
  } satisfies IShoppingMallSystemSetting.IUpdate;

  const updatedSetting: IShoppingMallSystemSetting =
    await api.functional.shoppingMall.admin.systemSettings.update(connection, {
      id: setting.id,
      body: updateBody,
    });
  typia.assert(updatedSetting);

  // Step 4: Validate the update
  TestValidator.equals(
    "updated key matches",
    updatedSetting.key,
    updateBody.key,
  );
  TestValidator.equals(
    "updated value matches",
    updatedSetting.value,
    updateBody.value,
  );
  TestValidator.equals(
    "updated description matches",
    updatedSetting.description ?? null,
    updateBody.description ?? null,
  );
}
