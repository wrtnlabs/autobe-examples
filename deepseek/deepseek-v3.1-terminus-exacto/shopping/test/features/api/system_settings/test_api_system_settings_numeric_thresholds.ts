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

export async function test_api_system_settings_numeric_thresholds(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create integer setting: inventory.restock.threshold
  const integerSetting =
    await api.functional.ecommerce.administrator.system_settings.create(
      adminConnection,
      {
        body: {
          setting_key: "inventory.restock.threshold",
          value_type: "int",
          setting_value: "50",
          description:
            "Minimum inventory level at which restocking is triggered",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(integerSetting);
  TestValidator.equals(
    "integer setting key matches",
    integerSetting.setting_key,
    "inventory.restock.threshold",
  );
  TestValidator.equals(
    "integer value type is int",
    integerSetting.value_type,
    "int",
  );
  TestValidator.equals(
    "integer setting value stored as string",
    integerSetting.setting_value,
    "50",
  );
  TestValidator.predicate(
    "integer setting is active",
    integerSetting.is_active,
  );
  // Create double setting: price.discount.threshold
  const doubleSetting =
    await api.functional.ecommerce.administrator.system_settings.create(
      adminConnection,
      {
        body: {
          setting_key: "price.discount.threshold",
          value_type: "double",
          setting_value: "0.15",
          description: "Discount percentage threshold for bulk pricing",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(doubleSetting);
  TestValidator.equals(
    "double setting key matches",
    doubleSetting.setting_key,
    "price.discount.threshold",
  );
  TestValidator.equals(
    "double value type is double",
    doubleSetting.value_type,
    "double",
  );
  TestValidator.equals(
    "double setting value stored as string",
    doubleSetting.setting_value,
    "0.15",
  );
  TestValidator.predicate("double setting is active", doubleSetting.is_active);
  // Additional validation: ensure setting values are different and types are correctly distinguished
  TestValidator.notEquals(
    "settings have different keys",
    integerSetting.setting_key,
    doubleSetting.setting_key,
  );
  TestValidator.notEquals(
    "value types are different",
    integerSetting.value_type,
    doubleSetting.value_type,
  );
  TestValidator.predicate(
    "integer value is a valid int format",
    /^\d+$/.test(integerSetting.setting_value),
  );
  TestValidator.predicate(
    "double value is a valid double format",
    /^\d+(\.\d+)?$/.test(doubleSetting.setting_value),
  );
}
