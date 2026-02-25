import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_settings_update_multiple_operations(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create a system setting to update
  const settingId = typia.random<string & tags.Format<"uuid">>();
  // 1. Update feature flag (boolean type)
  const update1 =
    await api.functional.ecommerce.superAdministrator.system_settings.update(
      adminConnection,
      {
        settingId,
        body: {
          setting_value: "true",
          value_type: "boolean",
          is_active: true,
          description: "Test feature flag",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(update1);
  TestValidator.equals("initial setting value", update1.setting_value, "true");
  TestValidator.equals("initial value type", update1.value_type, "string");
  TestValidator.predicate("initial active status", update1.is_active);
  // 2. Update numeric threshold (int type)
  const update2 =
    await api.functional.ecommerce.superAdministrator.system_settings.update(
      adminConnection,
      {
        settingId,
        body: {
          setting_value: "100",
          value_type: "int",
          description: "Updated numeric threshold",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(update2);
  TestValidator.equals("numeric setting value", update2.setting_value, "100");
  TestValidator.equals("numeric value type", update2.value_type, "string");
  TestValidator.predicate(
    "still active after numeric update",
    update2.is_active,
  );
  // 3. Update text configuration (string type)
  const update3 =
    await api.functional.ecommerce.superAdministrator.system_settings.update(
      adminConnection,
      {
        settingId,
        body: {
          description: "Updated text configuration",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(update3);
  TestValidator.equals("text value unchanged", update3.setting_value, "100");
  TestValidator.equals("value type unchanged", update3.value_type, "string");
  TestValidator.equals(
    "description updated",
    update3.description,
    "Updated text configuration",
  );
  TestValidator.predicate("still active after text update", update3.is_active);
  // Verify audit trail through updated_at timestamps
  TestValidator.notEquals(
    "timestamp changed after first update",
    update1.updated_at,
    update2.updated_at,
  );
  TestValidator.notEquals(
    "timestamp changed after second update",
    update2.updated_at,
    update3.updated_at,
  );
}
