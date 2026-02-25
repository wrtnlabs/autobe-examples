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

export async function test_api_system_setting_already_deleted_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authorize administrator
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create a test system setting
  const systemSetting =
    await generate_random_ecommerce_administrator_system_settings_create(
      adminConnection,
      {
        body: {
          setting_key: "test.prevent_duplicate_deletion",
          value_type: "string",
          setting_value: "test_value",
          description: "Test setting for duplicate deletion prevention",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(systemSetting);
  // First deletion - should succeed
  await api.functional.ecommerce.administrator.system_settings.erase(
    adminConnection,
    {
      settingId: systemSetting.id,
    },
  );
  // Second deletion attempt - should throw error
  await TestValidator.httpError(
    "deleting already deleted setting",
    404,
    async () => {
      await api.functional.ecommerce.administrator.system_settings.erase(
        adminConnection,
        {
          settingId: systemSetting.id,
        },
      );
    },
  );
}
