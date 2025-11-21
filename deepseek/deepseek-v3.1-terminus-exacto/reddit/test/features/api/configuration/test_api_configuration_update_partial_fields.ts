import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test the ability to update individual configuration fields without affecting
 * unchanged values. This scenario validates that the partial update
 * functionality works correctly, allowing administrators to modify specific
 * attributes like description, category, or sensitivity flags while preserving
 * other configuration properties. The test should verify that only the
 * specified fields are modified and that validation is applied appropriately to
 * the changed values.
 */
export async function test_api_configuration_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create initial configuration with complete field set
  const initialConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `config.test.${RandomGenerator.alphaNumeric(8)}`,
          value: "initial_value",
          data_type: "string",
          description: "Initial configuration description",
          category: "test_category",
          is_sensitive: false,
          is_editable: true,
          default_value: "default_value",
          min_value: "0",
          max_value: "100",
          validation_regex: "^[a-zA-Z0-9_]+$",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);

  // Step 3: Perform partial update targeting description field only
  const update1 =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationKey: initialConfig.key,
        body: {
          description: "Updated configuration description",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(update1);

  // Verify only description was updated, other fields unchanged
  TestValidator.equals(
    "description should be updated",
    update1.description,
    "Updated configuration description",
  );
  TestValidator.equals(
    "value should remain unchanged",
    update1.value,
    initialConfig.value,
  );
  TestValidator.equals(
    "category should remain unchanged",
    update1.category,
    initialConfig.category,
  );
  TestValidator.equals(
    "is_sensitive should remain unchanged",
    update1.is_sensitive,
    initialConfig.is_sensitive,
  );

  // Step 4: Perform partial update targeting category and sensitivity
  const update2 =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationKey: initialConfig.key,
        body: {
          category: "updated_category",
          is_sensitive: true,
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(update2);

  // Verify category and sensitivity updated, description preserved from previous update
  TestValidator.equals(
    "category should be updated",
    update2.category,
    "updated_category",
  );
  TestValidator.equals(
    "is_sensitive should be updated",
    update2.is_sensitive,
    true,
  );
  TestValidator.equals(
    "description should remain from previous update",
    update2.description,
    "Updated configuration description",
  );
  TestValidator.equals(
    "value should remain unchanged",
    update2.value,
    initialConfig.value,
  );

  // Step 5: Perform partial update targeting value field
  const update3 =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationKey: initialConfig.key,
        body: {
          value: "updated_value",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(update3);

  // Verify value updated, other fields preserved
  TestValidator.equals(
    "value should be updated",
    update3.value,
    "updated_value",
  );
  TestValidator.equals(
    "category should remain from previous update",
    update3.category,
    "updated_category",
  );
  TestValidator.equals(
    "is_sensitive should remain from previous update",
    update3.is_sensitive,
    true,
  );
  TestValidator.equals(
    "description should remain from previous update",
    update3.description,
    "Updated configuration description",
  );

  // Step 6: Test business logic error - attempting to update non-editable configuration
  // First make configuration non-editable
  const nonEditableUpdate =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationKey: initialConfig.key,
        body: {
          is_editable: false,
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(nonEditableUpdate);

  // Then attempt to update the non-editable configuration
  await TestValidator.error(
    "should reject update on non-editable configuration",
    async () => {
      await api.functional.communityPlatform.admin.configurations.update(
        connection,
        {
          configurationKey: initialConfig.key,
          body: {
            value: "should_fail_value",
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    },
  );

  // Step 7: Final validation of accumulated partial updates
  // Re-enable editing for final verification
  const finalUpdate =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationKey: initialConfig.key,
        body: {
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(finalUpdate);

  // Comprehensive validation of all accumulated changes
  TestValidator.equals(
    "final value should be from update3",
    finalUpdate.value,
    "updated_value",
  );
  TestValidator.equals(
    "final category should be from update2",
    finalUpdate.category,
    "updated_category",
  );
  TestValidator.equals(
    "final is_sensitive should be from update2",
    finalUpdate.is_sensitive,
    true,
  );
  TestValidator.equals(
    "final description should be from update1",
    finalUpdate.description,
    "Updated configuration description",
  );
  TestValidator.equals(
    "final is_editable should be re-enabled",
    finalUpdate.is_editable,
    true,
  );
  TestValidator.equals(
    "data_type should remain unchanged throughout",
    finalUpdate.data_type,
    initialConfig.data_type,
  );
  TestValidator.equals(
    "default_value should remain unchanged",
    finalUpdate.default_value,
    initialConfig.default_value,
  );
  TestValidator.equals(
    "min_value should remain unchanged",
    finalUpdate.min_value,
    initialConfig.min_value,
  );
  TestValidator.equals(
    "max_value should remain unchanged",
    finalUpdate.max_value,
    initialConfig.max_value,
  );
  TestValidator.equals(
    "validation_regex should remain unchanged",
    finalUpdate.validation_regex,
    initialConfig.validation_regex,
  );
}
