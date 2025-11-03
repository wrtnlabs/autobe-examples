import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";

export async function test_api_system_setting_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin user
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Create a new system setting with unique key
  const key = `test_setting_key_${RandomGenerator.alphaNumeric(6)}`;
  const value = `test_value_${RandomGenerator.alphaNumeric(10)}`;

  const createBody: IShoppingMallSystemSetting.ICreate = {
    key: key,
    value: value,
    description: `Test description for ${key}`,
  } satisfies IShoppingMallSystemSetting.ICreate;

  const createdSetting: IShoppingMallSystemSetting =
    await api.functional.shoppingMall.admin.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(createdSetting);

  TestValidator.equals("created setting key matches", createdSetting.key, key);
  TestValidator.equals(
    "created setting value matches",
    createdSetting.value,
    value,
  );
  TestValidator.predicate(
    "created setting has non-empty id",
    typeof createdSetting.id === "string" && createdSetting.id.length > 0,
  );
  TestValidator.predicate(
    "created setting has creation timestamp",
    typeof createdSetting.created_at === "string" &&
      createdSetting.created_at.length > 0,
  );

  // 3. Attempt to create another setting with same key to ensure failure
  await TestValidator.error(
    "duplicate system setting key should fail",
    async () => {
      await api.functional.shoppingMall.admin.systemSettings.create(
        connection,
        {
          body: {
            key: key,
            value: `duplicate_${RandomGenerator.alphaNumeric(8)}`,
            description: "This duplicate test should fail",
          } satisfies IShoppingMallSystemSetting.ICreate,
        },
      );
    },
  );
}
