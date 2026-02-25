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
 * Test creating a boolean configuration setting for feature toggles.
 * Administrator activates a new feature flag 'beta.checkout.express_enabled' with value 'true'.
 * Validate boolean type parsing and ensure setting becomes immediately active for platform use.
 * Verify response includes proper value casting and is_active status.
 */
export async function test_api_system_settings_boolean_feature_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate administrator with dedicated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create boolean system setting using admin connection
  const systemSetting =
    await api.functional.ecommerce.administrator.system_settings.create(
      adminConnection,
      {
        body: {
          setting_key: "beta.checkout.express_enabled",
          value_type: "boolean",
          setting_value: "true",
          description:
            "Enable beta express checkout feature for faster processing",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(systemSetting);
  // 3. Validate response structure and boolean parsing
  TestValidator.equals(
    "setting key matches",
    systemSetting.setting_key,
    "beta.checkout.express_enabled",
  );
  TestValidator.equals(
    "value type is boolean",
    systemSetting.value_type,
    "boolean",
  );
  TestValidator.equals(
    "setting value is 'true'",
    systemSetting.setting_value,
    "true",
  );
  TestValidator.predicate("setting is active", systemSetting.is_active);
  // 4. Test boolean parsing explicitly
  TestValidator.predicate(
    "boolean value parses correctly",
    systemSetting.setting_value === "true" &&
      typeof JSON.parse(systemSetting.setting_value) === "boolean",
  );
  TestValidator.predicate(
    "has valid UUID",
    typia.is<string & tags.Format<"uuid">>(systemSetting.id),
  );
  TestValidator.predicate(
    "has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(systemSetting.created_at),
  );
  TestValidator.predicate(
    "has update timestamp",
    typia.is<string & tags.Format<"date-time">>(systemSetting.updated_at),
  );
  TestValidator.equals("not deleted", systemSetting.deleted_at, null);
}
