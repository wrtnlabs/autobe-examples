import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test the creation of a system configuration in inactive state for staged
 * deployment workflows.
 *
 * An administrator creates a new configuration with status set to 'inactive',
 * allowing the configuration to be prepared in the database without immediately
 * affecting platform behavior. The test validates that inactive configurations
 * are created successfully but are not applied to platform operations until
 * explicitly activated.
 *
 * This scenario supports use cases where administrators need to prepare
 * settings before deployment, test configurations in controlled environments,
 * or stage multiple related settings for simultaneous activation.
 *
 * Test Steps:
 *
 * 1. Authenticate as administrator to gain system configuration management
 *    permissions
 * 2. Create a new system configuration with status explicitly set to "inactive"
 * 3. Validate the created configuration contains all required properties
 * 4. Verify the status is "inactive" as specified
 * 5. Confirm system-generated fields are present and deleted_at is null
 */
export async function test_api_system_config_creation_with_inactive_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create system configuration with inactive status
  const configKey = "max_upload_file_size";
  const configValue = "10485760";
  const valueType = "integer";
  const description =
    "Maximum allowed file size for uploads in bytes. Default is 10MB (10485760 bytes). Increase this value to allow larger file uploads.";
  const category = RandomGenerator.pick([
    "payment",
    "shipping",
    "email",
    "platform",
    "commission",
    "features",
    "security",
  ] as const);
  const status = "inactive";
  const isSensitive = false;

  const configData = {
    config_key: configKey,
    config_value: configValue,
    value_type: valueType,
    description: description,
    category: category,
    status: status,
    is_sensitive: isSensitive,
  } satisfies IShoppingMallSystemConfig.ICreate;

  const createdConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: configData,
    });
  typia.assert(createdConfig);

  // Step 3: Validate the created configuration
  TestValidator.equals(
    "config_key matches",
    createdConfig.config_key,
    configKey,
  );
  TestValidator.equals(
    "config_value matches",
    createdConfig.config_value,
    configValue,
  );
  TestValidator.equals(
    "value_type matches",
    createdConfig.value_type,
    valueType,
  );
  TestValidator.equals(
    "description matches",
    createdConfig.description,
    description,
  );
  TestValidator.equals("category matches", createdConfig.category, category);
  TestValidator.equals(
    "is_sensitive matches",
    createdConfig.is_sensitive,
    isSensitive,
  );

  // Step 4: Verify status is inactive
  TestValidator.equals("status is inactive", createdConfig.status, "inactive");

  // Step 5: Validate configuration is not soft-deleted
  TestValidator.equals("deleted_at is null", createdConfig.deleted_at, null);
}
