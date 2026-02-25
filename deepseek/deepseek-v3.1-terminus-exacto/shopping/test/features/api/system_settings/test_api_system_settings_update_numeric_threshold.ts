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

export async function test_api_system_settings_update_numeric_threshold(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create integer system setting
  const intSetting =
    await api.functional.ecommerce.administrator.system_settings.create(
      adminConnection,
      {
        body: {
          setting_key: "inventory.low_stock_threshold",
          value_type: "int",
          setting_value: "10",
          description: "Minimum stock level before reorder notification",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(intSetting);
  // Create double system setting
  const doubleSetting =
    await api.functional.ecommerce.administrator.system_settings.create(
      adminConnection,
      {
        body: {
          setting_key: "tax.rate",
          value_type: "double",
          setting_value: "0.08",
          description: "Default tax rate for products",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(doubleSetting);
  // Update integer setting to 25
  const updatedInt =
    await api.functional.ecommerce.administrator.system_settings.update(
      adminConnection,
      {
        settingId: intSetting.id,
        body: {
          setting_value: "25",
          description: "Updated minimum stock threshold with higher buffer",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedInt);
  TestValidator.equals(
    "integer setting value updated",
    updatedInt.setting_value,
    "25",
  );
  TestValidator.equals(
    "description updated",
    updatedInt.description,
    "Updated minimum stock threshold with higher buffer",
  );
  // Update double setting to 0.095
  const updatedDouble =
    await api.functional.ecommerce.administrator.system_settings.update(
      adminConnection,
      {
        settingId: doubleSetting.id,
        body: {
          setting_value: "0.095",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedDouble);
  TestValidator.equals(
    "double setting value updated",
    updatedDouble.setting_value,
    "0.095",
  );
  // Test business logic: description update without changing value
  const descriptionOnlyUpdate =
    await api.functional.ecommerce.administrator.system_settings.update(
      adminConnection,
      {
        settingId: intSetting.id,
        body: {
          description: "Final description update preserving numeric value",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(descriptionOnlyUpdate);
  TestValidator.equals(
    "value preserved after description update",
    descriptionOnlyUpdate.setting_value,
    "25",
  );
  TestValidator.equals(
    "description updated separately",
    descriptionOnlyUpdate.description,
    "Final description update preserving numeric value",
  );
  // Test numeric boundary validation (business logic with valid types)
  // Update to boundary integer value
  const boundaryIntUpdate =
    await api.functional.ecommerce.administrator.system_settings.update(
      adminConnection,
      {
        settingId: intSetting.id,
        body: {
          setting_value: "0",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(boundaryIntUpdate);
  TestValidator.equals(
    "integer boundary value accepted",
    boundaryIntUpdate.setting_value,
    "0",
  );
  // Test decimal precision for double
  const precisionDoubleUpdate =
    await api.functional.ecommerce.administrator.system_settings.update(
      adminConnection,
      {
        settingId: doubleSetting.id,
        body: {
          setting_value: "0.123456789",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(precisionDoubleUpdate);
  TestValidator.equals(
    "double precision value accepted",
    precisionDoubleUpdate.setting_value,
    "0.123456789",
  );
}
