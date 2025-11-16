import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test updating both the value and description fields of an existing
 * configuration simultaneously.
 *
 * This scenario validates that administrators can make comprehensive
 * configuration changes including updating the value and improving its
 * documentation at the same time.
 *
 * Test workflow:
 *
 * 1. Administrator registration to obtain authentication credentials
 * 2. Creation of an initial platform configuration with key, value, and
 *    description
 * 3. Update of both the value and description fields together
 * 4. Verification that both fields are correctly updated in the response
 * 5. Confirmation that the configuration key remains immutable
 * 6. Validation that all updated fields are properly reflected
 * 7. Verification that the updated_at timestamp reflects the latest modification
 *    time
 */
export async function test_api_platform_configuration_update_value_with_description(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123";
  const adminName = RandomGenerator.name();
  const adminUsername = RandomGenerator.alphaNumeric(8);

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin",
        referrer: null,
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create initial platform configuration
  const configurationKey = `config_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = "initial_value";
  const initialDescription = "Initial configuration description";
  const configDataType = "string";

  const createdConfiguration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configurationKey,
          value: initialValue,
          description: initialDescription,
          data_type: configDataType,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfiguration);

  TestValidator.equals(
    "created configuration key matches input",
    createdConfiguration.key,
    configurationKey,
  );
  TestValidator.equals(
    "created configuration value matches initial value",
    createdConfiguration.value,
    initialValue,
  );
  TestValidator.equals(
    "created configuration description matches initial description",
    createdConfiguration.description,
    initialDescription,
  );
  TestValidator.equals(
    "created configuration data_type is preserved",
    createdConfiguration.data_type,
    configDataType,
  );
  TestValidator.predicate(
    "created configuration deleted_at is null for active configuration",
    createdConfiguration.deleted_at === null ||
      createdConfiguration.deleted_at === undefined,
  );

  const createdId = createdConfiguration.id;
  const createdTimestamp = createdConfiguration.created_at;
  const initialUpdatedTimestamp = createdConfiguration.updated_at;

  // Step 3: Update both value and description fields
  const newValue = "updated_value_" + RandomGenerator.alphaNumeric(6);
  const newDescription =
    "Updated comprehensive documentation for the configuration";

  const updatedConfiguration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.update(
      connection,
      {
        configurationKey: configurationKey,
        body: {
          value: newValue,
          description: newDescription,
        } satisfies ICommunityPlatformConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfiguration);

  // Step 4: Verify both fields are correctly updated in response
  TestValidator.equals(
    "updated configuration value matches new value",
    updatedConfiguration.value,
    newValue,
  );
  TestValidator.equals(
    "updated configuration description matches new description",
    updatedConfiguration.description,
    newDescription,
  );

  // Step 5: Confirm configuration key and data_type remain immutable
  TestValidator.equals(
    "configuration key remains immutable after update",
    updatedConfiguration.key,
    configurationKey,
  );
  TestValidator.equals(
    "configuration data_type remains immutable after update",
    updatedConfiguration.data_type,
    configDataType,
  );

  // Step 6: Validate all updated fields are properly reflected
  TestValidator.equals(
    "configuration ID remains unchanged after update",
    updatedConfiguration.id,
    createdId,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged after update",
    updatedConfiguration.created_at,
    createdTimestamp,
  );
  TestValidator.predicate(
    "updated configuration deleted_at is null for active configuration",
    updatedConfiguration.deleted_at === null ||
      updatedConfiguration.deleted_at === undefined,
  );

  // Step 7: Verify updated_at timestamp reflects latest modification time
  TestValidator.notEquals(
    "updated_at timestamp changed after configuration update",
    updatedConfiguration.updated_at,
    initialUpdatedTimestamp,
  );
  TestValidator.predicate(
    "updated_at timestamp is after initial update timestamp",
    new Date(updatedConfiguration.updated_at) >
      new Date(initialUpdatedTimestamp),
  );
}
