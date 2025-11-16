import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test updating only the description field of an existing configuration without
 * changing its value.
 *
 * This scenario validates that administrators can clarify or improve
 * configuration documentation by updating descriptions. The test creates a
 * configuration with an initial description, then updates only the description
 * field while keeping the value unchanged. It verifies that:
 *
 * 1. The description is updated correctly
 * 2. The value remains the same
 * 3. The updated_at timestamp reflects only this modification
 * 4. Selective field updates work correctly without affecting other fields
 *
 * This tests the ability to perform partial updates in configuration
 * management.
 */
export async function test_api_platform_configuration_update_description_only(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a configuration with an initial description
  const initialDescription = RandomGenerator.paragraph({
    sentences: 3,
  });
  const configurationKey = RandomGenerator.alphaNumeric(12);
  const configurationValue = RandomGenerator.alphaNumeric(8);

  const createdConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configurationKey,
          value: configurationValue,
          description: initialDescription,
          data_type: "string",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);

  // Verify initial configuration was created correctly
  TestValidator.equals(
    "created configuration key matches",
    createdConfig.key,
    configurationKey,
  );
  TestValidator.equals(
    "created configuration value matches",
    createdConfig.value,
    configurationValue,
  );
  TestValidator.equals(
    "created configuration description matches",
    createdConfig.description,
    initialDescription,
  );

  // Store initial timestamp to verify it changes after update
  const initialUpdatedAt = createdConfig.updated_at;

  // Step 3: Update only the description field, keeping the value unchanged
  const newDescription = RandomGenerator.paragraph({
    sentences: 5,
  });

  const updatedConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.update(
      connection,
      {
        configurationKey: configurationKey,
        body: {
          value: configurationValue, // Keep the same value
          description: newDescription, // Update only the description
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);

  // Step 4: Verify the update was successful
  TestValidator.equals(
    "configuration key unchanged after update",
    updatedConfig.key,
    configurationKey,
  );
  TestValidator.equals(
    "configuration value unchanged after update",
    updatedConfig.value,
    configurationValue,
  );
  TestValidator.equals(
    "configuration description updated correctly",
    updatedConfig.description,
    newDescription,
  );
  TestValidator.notEquals(
    "configuration description changed from initial",
    updatedConfig.description,
    initialDescription,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed after modification",
    updatedConfig.updated_at,
    initialUpdatedAt,
  );

  // Verify timestamps are in correct order
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedConfig.updated_at) >= new Date(updatedConfig.created_at),
  );

  // Step 5: Verify the created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedConfig.created_at,
    createdConfig.created_at,
  );
}
