import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_system_settings_create } from "../../../generate/generate_random_ecommerce_administrator_system_settings_create";
import { prepare_random_ecommerce_system_setting } from "../../../prepare/prepare_random_ecommerce_system_setting";

/**
 * Test updating a boolean system setting to enable/disable platform features.
 * 1. Create administrator account and authenticate
 * 2. Create a boolean system setting with initial value 'false'
 * 3. Update the setting to 'true' and validate all properties
 * 4. Verify timestamp changes and validate boolean value type constraints
 */
export async function test_api_system_settings_update_boolean_feature_flag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  typia.assert(administrator);
  // 2. Create initial boolean system setting
  const initialSetting =
    await generate_random_ecommerce_administrator_system_settings_create(
      adminConnection,
      {
        body: {
          setting_key: "feature.enable_new_payment_gateway",
          value_type: "boolean",
          setting_value: "false",
          description: "Enable/disable new payment gateway feature",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(initialSetting);
  // Verify initial setting creation
  TestValidator.equals(
    "initial value_type is boolean",
    initialSetting.value_type,
    "boolean",
  );
  TestValidator.equals(
    "initial setting_value is false",
    initialSetting.setting_value,
    "false",
  );
  TestValidator.equals(
    "initial is_active is true",
    initialSetting.is_active,
    true,
  );
  // 3. Update the boolean setting to 'true'
  const updatedSetting =
    await api.functional.ecommerce.administrator.system_settings.update(
      adminConnection,
      {
        settingId: initialSetting.id,
        body: {
          setting_value: "true",
          is_active: true,
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedSetting);
  // 4. Validate the update results
  TestValidator.equals(
    "setting ID remains unchanged",
    updatedSetting.id,
    initialSetting.id,
  );
  TestValidator.equals(
    "setting_key remains unchanged",
    updatedSetting.setting_key,
    initialSetting.setting_key,
  );
  TestValidator.equals(
    "value_type remains boolean",
    updatedSetting.value_type,
    "boolean",
  );
  TestValidator.equals(
    "setting_value updated to true",
    updatedSetting.setting_value,
    "true",
  );
  TestValidator.equals(
    "description remains unchanged",
    updatedSetting.description,
    initialSetting.description,
  );
  TestValidator.equals(
    "is_active remains true",
    updatedSetting.is_active,
    true,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedSetting.created_at,
    initialSetting.created_at,
  );
  TestValidator.notEquals(
    "updated_at should change",
    updatedSetting.updated_at,
    initialSetting.updated_at,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedSetting.deleted_at,
    null,
  );
  // 5. Test boolean value type validation with invalid value
  await TestValidator.error("invalid boolean value should fail", async () => {
    await api.functional.ecommerce.administrator.system_settings.update(
      adminConnection,
      {
        settingId: initialSetting.id,
        body: {
          setting_value: "invalid", // Not a valid boolean value
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  });
}
