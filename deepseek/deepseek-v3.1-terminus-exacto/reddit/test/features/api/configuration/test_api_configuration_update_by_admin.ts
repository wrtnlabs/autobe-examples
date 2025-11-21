import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test the complete workflow for updating existing platform configuration
 * settings. This scenario validates that administrators can successfully modify
 * configuration values while maintaining data integrity and validation
 * constraints.
 */
export async function test_api_configuration_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial configuration to be updated
  const initialConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `config.test.${RandomGenerator.alphaNumeric(8)}`,
          value: "initial_value",
          data_type: "string",
          description: "Test configuration for update validation",
          category: "test",
          is_sensitive: false,
          is_editable: true,
          default_value: "default_value",
          min_value: undefined,
          max_value: undefined,
          validation_regex: undefined,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);

  // Step 3: Update the configuration with new values
  const updatedConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationKey: initialConfig.key,
        body: {
          value: "updated_value",
          description: "Updated test configuration description",
          category: "updated_test",
          is_sensitive: true,
          is_editable: false,
          default_value: "updated_default",
          validation_regex: "^[a-zA-Z0-9_]+$",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);

  // Step 4: Validate that configuration was properly updated
  TestValidator.equals(
    "configuration key remains unchanged",
    updatedConfig.key,
    initialConfig.key,
  );
  TestValidator.equals(
    "value should be updated",
    updatedConfig.value,
    "updated_value",
  );
  TestValidator.equals(
    "description should be updated",
    updatedConfig.description,
    "Updated test configuration description",
  );
  TestValidator.equals(
    "category should be updated",
    updatedConfig.category,
    "updated_test",
  );
  TestValidator.predicate(
    "sensitivity flag should be updated",
    updatedConfig.is_sensitive === true,
  );
  TestValidator.predicate(
    "editability flag should be updated",
    updatedConfig.is_editable === false,
  );
  TestValidator.equals(
    "default value should be updated",
    updatedConfig.default_value,
    "updated_default",
  );
  TestValidator.equals(
    "validation regex should be updated",
    updatedConfig.validation_regex,
    "^[a-zA-Z0-9_]+$",
  );

  // Step 5: Validate timestamp updates
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedConfig.updated_at,
    initialConfig.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedConfig.created_at,
    initialConfig.created_at,
  );

  // Step 6: Validate administrator reference tracking
  TestValidator.predicate(
    "updated_by should reference the administrator",
    updatedConfig.updated_by !== undefined,
  );
  if (updatedConfig.updated_by) {
    TestValidator.equals(
      "updated_by admin ID should match",
      updatedConfig.updated_by.id,
      admin.id,
    );
    TestValidator.equals(
      "updated_by display name should match",
      updatedConfig.updated_by.display_name,
      admin.display_name,
    );
  }

  // Step 7: Test updating only specific fields (partial update)
  const partialUpdateConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationKey: initialConfig.key,
        body: {
          value: "partially_updated_value",
          category: "partial_update",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(partialUpdateConfig);

  // Validate partial update preserves unchanged fields
  TestValidator.equals(
    "value should be partially updated",
    partialUpdateConfig.value,
    "partially_updated_value",
  );
  TestValidator.equals(
    "category should be partially updated",
    partialUpdateConfig.category,
    "partial_update",
  );
  TestValidator.equals(
    "description should remain from previous update",
    partialUpdateConfig.description,
    "Updated test configuration description",
  );
  TestValidator.predicate(
    "sensitivity flag should remain from previous update",
    partialUpdateConfig.is_sensitive === true,
  );
  TestValidator.predicate(
    "editability flag should remain from previous update",
    partialUpdateConfig.is_editable === false,
  );

  // Step 8: Test numeric configuration with data type validation
  const numericConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `config.numeric.${RandomGenerator.alphaNumeric(8)}`,
          value: "100",
          data_type: "number",
          description: "Numeric configuration test",
          category: "limits",
          is_sensitive: false,
          is_editable: true,
          min_value: "0",
          max_value: "1000",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(numericConfig);

  // Update numeric configuration with valid value
  const updatedNumericConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationKey: numericConfig.key,
        body: {
          value: "500",
          min_value: "10",
          max_value: "900",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updatedNumericConfig);

  TestValidator.equals(
    "numeric value should be updated",
    updatedNumericConfig.value,
    "500",
  );
  TestValidator.equals(
    "min value should be updated",
    updatedNumericConfig.min_value,
    "10",
  );
  TestValidator.equals(
    "max value should be updated",
    updatedNumericConfig.max_value,
    "900",
  );

  // Step 9: Test boolean configuration update
  const booleanConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `config.boolean.${RandomGenerator.alphaNumeric(8)}`,
          value: "false",
          data_type: "boolean",
          description: "Boolean configuration test",
          category: "flags",
          is_sensitive: false,
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(booleanConfig);

  const updatedBooleanConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationKey: booleanConfig.key,
        body: {
          value: "true",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updatedBooleanConfig);

  TestValidator.equals(
    "boolean value should be updated",
    updatedBooleanConfig.value,
    "true",
  );
}
