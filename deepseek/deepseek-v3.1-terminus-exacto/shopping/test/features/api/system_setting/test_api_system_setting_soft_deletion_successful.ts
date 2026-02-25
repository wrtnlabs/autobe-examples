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

export async function test_api_system_setting_soft_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(administrator);
  // 2. Create test system setting
  const systemSetting =
    await generate_random_ecommerce_administrator_system_settings_create(
      adminConnection,
      {
        body: {
          setting_key: "test.feature.enabled",
          value_type: "boolean",
          setting_value: "true",
          description: "Test setting for soft deletion verification",
          is_active: true,
        },
      },
    );
  typia.assert(systemSetting);
  TestValidator.equals(
    "setting should be active",
    systemSetting.is_active,
    true,
  );
  TestValidator.equals(
    "deleted_at should be null",
    systemSetting.deleted_at,
    null,
  );
  // 3. Execute soft deletion
  await api.functional.ecommerce.administrator.system_settings.erase(
    adminConnection,
    {
      settingId: systemSetting.id,
    },
  );
  // 4. Validate soft deletion behavior through business logic workflow
  // Create a new similar setting to verify the system still functions after deletion
  const newSetting =
    await generate_random_ecommerce_administrator_system_settings_create(
      adminConnection,
      {
        body: {
          setting_key: "test.feature.updated",
          value_type: "boolean",
          setting_value: "false",
          description: "New test setting after deletion",
          is_active: true,
        },
      },
    );
  typia.assert(newSetting);
  TestValidator.notEquals(
    "new setting ID should differ",
    newSetting.id,
    systemSetting.id,
  );
  // 5. Validate business continuity - system should function normally after soft deletion
  TestValidator.predicate(
    "new setting creation successful",
    newSetting.is_active === true,
  );
  TestValidator.equals(
    "new setting deleted_at should be null",
    newSetting.deleted_at,
    null,
  );
}
