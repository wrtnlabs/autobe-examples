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

export async function test_api_system_settings_string_configuration(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create a string-type system setting with hierarchical key
  const settingBody = {
    setting_key: "payment.gateway.timeout",
    value_type:
      "string" satisfies IEcommerceSystemSetting.ICreate["value_type"],
    setting_value: "30s",
    description: "Payment gateway connection timeout in seconds",
    is_active: true,
  } satisfies IEcommerceSystemSetting.ICreate;
  const setting =
    await api.functional.ecommerce.administrator.system_settings.create(
      adminConnection,
      { body: settingBody },
    );
  typia.assert(setting);
  // Validate the created setting - business logic only (no redundant format validation)
  TestValidator.equals(
    "setting key should match",
    setting.setting_key,
    "payment.gateway.timeout",
  );
  TestValidator.equals(
    "value type should be string",
    setting.value_type,
    "string",
  );
  TestValidator.equals(
    "setting value should be 30s",
    setting.setting_value,
    "30s",
  );
  TestValidator.equals(
    "description should match",
    setting.description,
    "Payment gateway connection timeout in seconds",
  );
  TestValidator.predicate(
    "is_active should be true",
    setting.is_active === true,
  );
  TestValidator.predicate(
    "deleted_at should be null for active setting",
    setting.deleted_at === null,
  );
  // Test uniqueness validation - attempt to create duplicate key
  await TestValidator.error("duplicate setting key should fail", async () => {
    await api.functional.ecommerce.administrator.system_settings.create(
      adminConnection,
      { body: settingBody },
    );
  });
}
