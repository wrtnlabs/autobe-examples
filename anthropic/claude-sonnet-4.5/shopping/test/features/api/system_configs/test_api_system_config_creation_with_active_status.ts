import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test the creation of a new platform system configuration setting with active
 * status.
 *
 * This test validates the complete workflow of creating a system configuration
 * entry that becomes immediately effective. An administrator creates a new
 * configuration with a unique config_key, specifying all required metadata
 * including value, type, description, category, and active status.
 *
 * The test verifies:
 *
 * 1. Successful authentication as administrator
 * 2. Successful creation of system configuration with all required fields
 * 3. Proper initialization of auto-generated fields (id, timestamps)
 * 4. Immediate availability of the configuration for platform use (active status)
 * 5. Complete response structure validation
 */
export async function test_api_system_config_creation_with_active_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator to gain system configuration permissions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2: Prepare system configuration data with active status
  const configKey = `test_feature_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = "enabled";
  const valueType = "string";
  const description = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const category = RandomGenerator.pick([
    "payment",
    "shipping",
    "email",
    "platform",
    "commission",
    "features",
    "security",
  ] as const);
  const status = "active" as const;
  const isSensitive = false;

  const configCreateBody = {
    config_key: configKey,
    config_value: configValue,
    value_type: valueType,
    description: description,
    category: category,
    status: status,
    is_sensitive: isSensitive,
  } satisfies IShoppingMallSystemConfig.ICreate;

  // Step 3: Create the system configuration
  const createdConfig: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: configCreateBody,
    });
  typia.assert(createdConfig);

  // Step 4: Validate the response structure and content
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
  TestValidator.equals("status is active", createdConfig.status, "active");
  TestValidator.equals(
    "is_sensitive matches",
    createdConfig.is_sensitive,
    isSensitive,
  );

  // Step 5: Validate auto-generated fields
  TestValidator.predicate("id is generated", createdConfig.id.length > 0);
  TestValidator.predicate(
    "created_at is set",
    createdConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    createdConfig.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active config",
    createdConfig.deleted_at,
    null,
  );
}
