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

export async function test_api_system_settings_update_string_and_uri_configurations(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create a string type system setting for currency
  const stringSetting =
    await generate_random_ecommerce_administrator_system_settings_create(
      adminConnection,
      {
        body: {
          setting_key: "payment.default_currency",
          value_type: "string",
          setting_value: "USD",
          description: "Default currency for payment processing",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(stringSetting);
  // Create a URI type system setting for external service endpoint
  const uriSetting =
    await generate_random_ecommerce_administrator_system_settings_create(
      adminConnection,
      {
        body: {
          setting_key: "api.external_service_endpoint",
          value_type: "uri",
          setting_value: "https://api.example.com/v1",
          description: "External API endpoint for service integration",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(uriSetting);
  // Test 1: Update string setting value from USD to EUR
  const updatedStringSetting =
    await api.functional.ecommerce.administrator.system_settings.update(
      adminConnection,
      {
        settingId: stringSetting.id,
        body: {
          setting_value: "EUR",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedStringSetting);
  // Validate string setting update
  TestValidator.equals(
    "setting key should remain unchanged",
    updatedStringSetting.setting_key,
    "payment.default_currency",
  );
  TestValidator.equals(
    "value type should remain string",
    updatedStringSetting.value_type,
    "string",
  );
  TestValidator.equals(
    "setting value should be updated to EUR",
    updatedStringSetting.setting_value,
    "EUR",
  );
  TestValidator.equals(
    "description should be preserved",
    updatedStringSetting.description,
    "Default currency for payment processing",
  );
  TestValidator.predicate(
    "setting should remain active",
    updatedStringSetting.is_active,
  );
  // Test 2: Update URI setting with partial fields (description and is_active)
  const updatedUriSetting =
    await api.functional.ecommerce.administrator.system_settings.update(
      adminConnection,
      {
        settingId: uriSetting.id,
        body: {
          description: "Updated external API endpoint description",
          is_active: false,
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedUriSetting);
  // Validate URI setting partial update
  TestValidator.equals(
    "URI setting key should remain unchanged",
    updatedUriSetting.setting_key,
    "api.external_service_endpoint",
  );
  TestValidator.equals(
    "value type should remain uri",
    updatedUriSetting.value_type,
    "uri",
  );
  TestValidator.equals(
    "URI value should be preserved",
    updatedUriSetting.setting_value,
    "https://api.example.com/v1",
  );
  TestValidator.equals(
    "description should be updated",
    updatedUriSetting.description,
    "Updated external API endpoint description",
  );
  TestValidator.predicate(
    "setting should be deactivated",
    !updatedUriSetting.is_active,
  );
  // Test 3: Reactivate the URI setting
  const reactivatedUriSetting =
    await api.functional.ecommerce.administrator.system_settings.update(
      adminConnection,
      {
        settingId: uriSetting.id,
        body: {
          is_active: true,
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(reactivatedUriSetting);
  // Validate URI setting reactivation
  TestValidator.predicate(
    "URI setting should be reactivated",
    reactivatedUriSetting.is_active,
  );
  TestValidator.equals(
    "URI description should remain updated",
    reactivatedUriSetting.description,
    "Updated external API endpoint description",
  );
  TestValidator.equals(
    "URI value should still be preserved",
    reactivatedUriSetting.setting_value,
    "https://api.example.com/v1",
  );
}
