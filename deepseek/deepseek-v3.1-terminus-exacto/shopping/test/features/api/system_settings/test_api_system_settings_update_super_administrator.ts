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

export async function test_api_system_settings_update_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator authentication connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create super admin account using utility function
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // Generate a random UUID for an existing system setting (simulating pre-existing setting)
  const existingSettingId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Update setting with valid string value
  const firstUpdate =
    await api.functional.ecommerce.superAdministrator.system_settings.update(
      superAdminConnection,
      {
        settingId: existingSettingId,
        body: {
          setting_key: "app.max_file_size",
          value_type: "string",
          setting_value: "10MB",
          description: "Maximum file upload size",
          is_active: true,
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // Store original values for comparison
  const firstSettingKey = firstUpdate.setting_key;
  const firstSettingValue = firstUpdate.setting_value;
  const firstDescription = firstUpdate.description;
  const firstIsActive = firstUpdate.is_active;
  const firstUpdatedAt = firstUpdate.updated_at;
  // Test 2: Partial update - update only description
  const partialUpdate =
    await api.functional.ecommerce.superAdministrator.system_settings.update(
      superAdminConnection,
      {
        settingId: existingSettingId,
        body: {
          description: "Updated maximum file upload size",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(partialUpdate);
  // Verify partial update - only description changed
  TestValidator.equals(
    "description updated",
    partialUpdate.description,
    "Updated maximum file upload size",
  );
  TestValidator.equals(
    "setting key unchanged",
    partialUpdate.setting_key,
    firstSettingKey,
  );
  TestValidator.equals(
    "setting value unchanged",
    partialUpdate.setting_value,
    firstSettingValue,
  );
  TestValidator.equals(
    "is_active unchanged",
    partialUpdate.is_active,
    firstIsActive,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    partialUpdate.updated_at,
    firstUpdatedAt,
  );
  // Test 3: Multiple field update with valid boolean value
  const multipleUpdate =
    await api.functional.ecommerce.superAdministrator.system_settings.update(
      superAdminConnection,
      {
        settingId: existingSettingId,
        body: {
          setting_value: "false",
          description: "Maximum file size with boolean indicator",
          is_active: false,
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(multipleUpdate);
  // Verify multiple field updates
  TestValidator.equals(
    "setting value updated",
    multipleUpdate.setting_value,
    "false",
  );
  TestValidator.equals(
    "description updated",
    multipleUpdate.description,
    "Maximum file size with boolean indicator",
  );
  TestValidator.equals("is_active updated", multipleUpdate.is_active, false);
  TestValidator.equals(
    "setting key preserved",
    multipleUpdate.setting_key,
    firstSettingKey,
  );
  TestValidator.predicate(
    "updated_at refreshed again",
    multipleUpdate.updated_at !== partialUpdate.updated_at &&
      multipleUpdate.updated_at !== firstUpdatedAt,
  );
  // Test 4: Update with numeric value type
  const numericUpdate =
    await api.functional.ecommerce.superAdministrator.system_settings.update(
      superAdminConnection,
      {
        settingId: existingSettingId,
        body: {
          value_type: "int",
          setting_value: "50",
          description: "Restock threshold configuration",
          is_active: true,
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(numericUpdate);
  // Verify numeric update
  TestValidator.equals("value_type updated", numericUpdate.value_type, "int");
  TestValidator.equals("numeric value set", numericUpdate.setting_value, "50");
  TestValidator.equals(
    "description updated",
    numericUpdate.description,
    "Restock threshold configuration",
  );
  TestValidator.equals("is_active reactivated", numericUpdate.is_active, true);
  // Test 5: URI value type update
  const uriUpdate =
    await api.functional.ecommerce.superAdministrator.system_settings.update(
      superAdminConnection,
      {
        settingId: existingSettingId,
        body: {
          value_type: "uri",
          setting_value: "https://example.com/api",
          description: "External API endpoint configuration",
        } satisfies IEcommerceSystemSetting.IUpdate,
      },
    );
  typia.assert(uriUpdate);
  TestValidator.equals("URI value type set", uriUpdate.value_type, "uri");
  TestValidator.equals(
    "URI value configured",
    uriUpdate.setting_value,
    "https://example.com/api",
  );
  // Final validation - comprehensive check of all update patterns
  TestValidator.predicate(
    "all update scenarios tested successfully",
    uriUpdate.value_type === "uri" &&
      uriUpdate.setting_value === "https://example.com/api" &&
      uriUpdate.description === "External API endpoint configuration" &&
      uriUpdate.is_active === true &&
      uriUpdate.updated_at > firstUpdatedAt,
  );
}
