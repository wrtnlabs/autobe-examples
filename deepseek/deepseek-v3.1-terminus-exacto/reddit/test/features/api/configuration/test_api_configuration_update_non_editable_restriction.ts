import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test the system's enforcement of non-editable configuration restrictions.
 *
 * This E2E test validates that configurations marked as non-editable cannot be
 * modified through the update operation, even by administrators with
 * appropriate privileges. The test verifies that attempts to update
 * non-editable configurations are properly rejected with appropriate error
 * messages, ensuring that critical system settings remain protected from
 * accidental or unauthorized modification.
 */
export async function test_api_configuration_update_non_editable_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a non-editable configuration
  const nonEditableConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `non_editable_config_${typia.random<string & tags.Format<"uuid">>()}`,
          value: "original_value",
          data_type: "string",
          description:
            "This is a non-editable configuration for testing purposes",
          category: "security",
          is_sensitive: false,
          is_editable: false, // Critical: Mark as non-editable
          default_value: "default_value",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(nonEditableConfig);
  TestValidator.equals(
    "configuration is marked as non-editable",
    nonEditableConfig.is_editable,
    false,
  );

  // Step 3: Attempt to update the non-editable configuration and verify it fails
  await TestValidator.error(
    "non-editable configuration should reject update attempts",
    async () => {
      await api.functional.communityPlatform.admin.configurations.update(
        connection,
        {
          configurationKey: nonEditableConfig.key,
          body: {
            value: "attempted_new_value",
            description: "Attempted updated description",
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    },
  );

  // Step 4: Create an editable configuration for comparison
  const editableConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `editable_config_${typia.random<string & tags.Format<"uuid">>()}`,
          value: "editable_original_value",
          data_type: "string",
          description: "This is an editable configuration for testing purposes",
          category: "general",
          is_sensitive: false,
          is_editable: true, // Critical: Mark as editable
          default_value: "editable_default",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(editableConfig);
  TestValidator.equals(
    "editable configuration is marked as editable",
    editableConfig.is_editable,
    true,
  );

  // Step 5: Verify that editable configurations CAN be updated successfully
  const updatedEditableConfig =
    await api.functional.communityPlatform.admin.configurations.update(
      connection,
      {
        configurationKey: editableConfig.key,
        body: {
          value: "successfully_updated_value",
          description: "Successfully updated description",
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updatedEditableConfig);
  TestValidator.equals(
    "editable configuration value was updated",
    updatedEditableConfig.value,
    "successfully_updated_value",
  );
  TestValidator.equals(
    "editable configuration description was updated",
    updatedEditableConfig.description,
    "Successfully updated description",
  );
}
