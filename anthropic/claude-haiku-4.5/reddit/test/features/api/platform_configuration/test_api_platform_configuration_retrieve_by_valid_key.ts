import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test retrieving platform configuration settings by valid configuration keys.
 *
 * This test validates that an authenticated administrator can successfully
 * retrieve specific platform configuration entries by providing a known, valid
 * configuration key. The test creates an administrator account, then retrieves
 * multiple different configurations using valid keys and validates that each
 * response contains the complete configuration object with all required fields
 * properly populated.
 *
 * Steps:
 *
 * 1. Create an administrator account for authentication
 * 2. Retrieve a configuration using a valid key 'max_posts_per_hour'
 * 3. Validate the response contains all required configuration fields
 * 4. Confirm the returned key matches the requested key exactly
 * 5. Retrieve additional configurations with different valid keys
 * 6. Validate all responses have consistent structure and populated fields
 */
export async function test_api_platform_configuration_retrieve_by_valid_key(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2-4: Retrieve first configuration and validate
  const configKey1 = "max_posts_per_hour";
  const config1: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: configKey1,
      },
    );
  typia.assert(config1);
  TestValidator.equals(
    "first config key matches request",
    config1.key,
    configKey1,
  );
  TestValidator.predicate("config has non-empty key", config1.key.length > 0);
  TestValidator.predicate(
    "config has non-empty value",
    config1.value.length > 0,
  );
  TestValidator.predicate("config id is not null", config1.id !== null);
  TestValidator.predicate(
    "config created_at is not null",
    config1.created_at !== null,
  );
  TestValidator.predicate(
    "config updated_at is not null",
    config1.updated_at !== null,
  );

  // Step 5-6: Retrieve additional configurations with different valid keys
  const configKey2 = "voting_enabled";
  const config2: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: configKey2,
      },
    );
  typia.assert(config2);
  TestValidator.equals(
    "second config key matches request",
    config2.key,
    configKey2,
  );
  TestValidator.notEquals(
    "different configs have different IDs",
    config1.id,
    config2.id,
  );

  // Retrieve third configuration
  const configKey3 = "min_karma_to_post";
  const config3: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: configKey3,
      },
    );
  typia.assert(config3);
  TestValidator.equals(
    "third config key matches request",
    config3.key,
    configKey3,
  );

  // Validate all retrieved configurations have complete structure
  TestValidator.predicate(
    "first config has data_type",
    config1.data_type !== null,
  );
  TestValidator.predicate(
    "second config has data_type",
    config2.data_type !== null,
  );
  TestValidator.predicate(
    "third config has data_type",
    config3.data_type !== null,
  );
  TestValidator.predicate(
    "configs are distinct by key",
    config1.key !== config2.key && config2.key !== config3.key,
  );
}
