import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessSetting";

/**
 * Validate the update of an existing shopping business setting as an
 * administrator.
 *
 * This scenario confirms that an admin can update a business setting identified
 * by settingKey. After updating the setting_value and description, the test
 * checks that both fields reflect the new values and that the updated_at
 * timestamp has changed (for auditing). It verifies that updating a
 * non-existent settingKey produces the correct error. It also ensures non-admin
 * (unauthenticated) users are denied access to this privileged operation.
 *
 * Test Steps:
 *
 * 1. Register a new administrator account to obtain admin credentials.
 * 2. As the new admin, create a business setting with a unique setting_key.
 * 3. Update this setting with new setting_value and a new description. Confirm
 *    that the update is reflected in those fields and that updated_at changes
 *    from its previous value.
 * 4. Attempt to update a non-existent setting (random key) and verify an error is
 *    returned.
 * 5. Attempt to update the setting as a non-admin (unauthenticated/no token) and
 *    confirm access is denied.
 */
export async function test_api_business_settings_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new administrator account to obtain admin credentials.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role: "superadmin",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. As the new admin, create a business setting with a unique key.
  const settingKey = RandomGenerator.alphaNumeric(12);
  const settingCreateBody = {
    setting_key: settingKey,
    setting_value: "USD",
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingBusinessSetting.ICreate;

  const createdSetting =
    await api.functional.shopping.admin.businessSettings.create(connection, {
      body: settingCreateBody,
    });
  typia.assert(createdSetting);
  TestValidator.equals(
    "setting key matches",
    createdSetting.setting_key,
    settingKey,
  );
  const previousUpdatedAt = createdSetting.updated_at;

  // 3. Update this setting with new values
  const updateValue = "KRW";
  const updateDesc = RandomGenerator.paragraph();
  const settingUpdateBody = {
    setting_value: updateValue,
    description: updateDesc,
  } satisfies IShoppingBusinessSetting.IUpdate;

  const updatedSetting =
    await api.functional.shopping.admin.businessSettings.update(connection, {
      settingKey,
      body: settingUpdateBody,
    });
  typia.assert(updatedSetting);
  TestValidator.equals(
    "setting value updated",
    updatedSetting.setting_value,
    updateValue,
  );
  TestValidator.equals(
    "description updated",
    updatedSetting.description,
    updateDesc,
  );
  TestValidator.notEquals(
    "updated_at timestamp changes",
    updatedSetting.updated_at,
    previousUpdatedAt,
  );

  // 4. Update a non-existent settingKey (should error)
  const nonExistentKey = RandomGenerator.alphaNumeric(16);
  await TestValidator.error(
    "updating non-existent settingKey fails",
    async () => {
      await api.functional.shopping.admin.businessSettings.update(connection, {
        settingKey: nonExistentKey,
        body: settingUpdateBody,
      });
    },
  );

  // 5. Update as a non-admin (unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot update business setting",
    async () => {
      await api.functional.shopping.admin.businessSettings.update(unauthConn, {
        settingKey,
        body: settingUpdateBody,
      });
    },
  );
}
