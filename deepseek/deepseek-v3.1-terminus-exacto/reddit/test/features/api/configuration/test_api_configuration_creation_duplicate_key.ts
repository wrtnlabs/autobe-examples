import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test configuration creation behavior when attempting to create a
 * configuration with a duplicate key that already exists in the system.
 *
 * This test validates proper error handling and response codes when
 * administrators attempt to create configurations with non-unique keys. This
 * ensures data integrity by preventing duplicate configuration entries and
 * provides clear feedback for resolution.
 */
export async function test_api_configuration_creation_duplicate_key(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator to establish proper authorization context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial configuration to test duplicate key validation
  const configurationKey = RandomGenerator.alphaNumeric(10);
  const initialConfiguration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: configurationKey,
          value: "initial_value",
          data_type: "string",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category: "test",
          is_sensitive: false,
          is_editable: true,
          default_value: undefined,
          min_value: undefined,
          max_value: undefined,
          validation_regex: undefined,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(initialConfiguration);
  TestValidator.equals(
    "initial configuration key matches",
    initialConfiguration.key,
    configurationKey,
  );

  // Step 3: Attempt to create duplicate configuration with the same key
  await TestValidator.error(
    "duplicate configuration key should fail",
    async () => {
      await api.functional.communityPlatform.admin.configurations.create(
        connection,
        {
          body: {
            key: configurationKey,
            value: "duplicate_value",
            data_type: "string",
            description: RandomGenerator.paragraph({ sentences: 3 }),
            category: "test",
            is_sensitive: false,
            is_editable: true,
            default_value: undefined,
            min_value: undefined,
            max_value: undefined,
            validation_regex: undefined,
          } satisfies ICommunityPlatformConfiguration.ICreate,
        },
      );
    },
  );
}
