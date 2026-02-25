import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_system_settings_create_system_setting } from "../../../generate/generate_random_shopping_mall_administrator_system_settings_create_system_setting";
import { prepare_random_shopping_mall_system_setting } from "../../../prepare/prepare_random_shopping_mall_system_setting";

export async function test_api_system_setting_creation_duplicate_key_handling(
  connection: api.IConnection,
): Promise<void> {
  /*
     Scenario:
     1. Authenticate as administrator to gain permission to create system settings.
     2. Create a system setting with a unique key.
     3. Create another system setting using the same key to test conflict handling.
        a. Test if the system overwrites the existing value or rejects without update permission.
     4. Validate that the response for the duplicate key creation indicates correct business behavior (either updated or rejected).
     5. If update occurred, confirm the system setting has new values.
     6. If rejected, confirm error is thrown.
    */
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_` + RandomGenerator.alphaNumeric(8) + `@example.com`,
      password: `Password123!`,
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create a system setting with a unique key
  const initialSetting =
    await generate_random_shopping_mall_administrator_system_settings_create_system_setting(
      adminConnection,
      {
        body: {
          key: `duplicate_key_test_` + RandomGenerator.alphaNumeric(4),
          value: `initial_value`,
          description: `Initial creation`,
          data_type: `string`,
        },
      },
    );
  typia.assert(initialSetting);
  // 3a. Attempt to create system setting with the same key but different value to test update scenario
  const updatedValue = `updated_value_` + RandomGenerator.alphaNumeric(6);
  const updateAttempt =
    await generate_random_shopping_mall_administrator_system_settings_create_system_setting(
      adminConnection,
      {
        body: {
          key: initialSetting.key,
          value: updatedValue,
          description: `Update attempt with duplicate key`,
          data_type: `string`,
        },
      },
    );
  typia.assert(updateAttempt);
  // 4. Confirm that the update is reflected in the returned record
  TestValidator.equals(
    `update reflects in system setting record`,
    updateAttempt.key,
    initialSetting.key,
  );
  TestValidator.equals(`value is updated`, updateAttempt.value, updatedValue);
  // 5. Additionally, try to create a system setting with the same key but simulate rejection by creating duplicate with no update permission scenario.
  // Since we do not have a special API to send "no update permission", we simulate the behavior by sending request.
  // Here we expect that the creation leads to update, based on the business rules from original description.
  // However, test the error reaction if server rejects duplicate key application.
  // If an error occurs, it should be caught and validated.
  const duplicateBody = {
    key: initialSetting.key,
    value: `another_value_` + RandomGenerator.alphaNumeric(5),
    description: `Duplicate create attempt without update`,
    data_type: `string`,
  } satisfies IShoppingMallSystemSetting.ICreate;
  await TestValidator.error(
    `reject duplicate key creation without update`,
    async () => {
      // The following call might succeed (update) or fail (error). We try expecting an error.
      await generate_random_shopping_mall_administrator_system_settings_create_system_setting(
        adminConnection,
        {
          body: duplicateBody,
        },
      );
    },
  );
}
