import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";

/**
 * Validate retrieval of a Reddit community system configuration by its unique
 * name.
 *
 * This test performs the full lifecycle: authenticates an admin, creates a
 * system configuration, and fetches it back by name to ensure consistency and
 * correctness.
 *
 * Steps:
 *
 * 1. Authenticate as admin via join endpoint.
 * 2. Create a new system configuration with a unique name, value, and description.
 * 3. Retrieve the created configuration by its name.
 * 4. Validate all fields, including created and updated timestamps are ISO
 *    strings.
 *
 * This ensures authorization, uniqueness, and data integrity in the system.
 */
export async function test_api_reddit_community_system_configuration_retrieval_by_name(
  connection: api.IConnection,
) {
  // Authenticate as admin user
  // Use realistic email and password for join operation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "strongPassword123";

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://redditcommunity.example.com/admin/join",
        referrer: "https://redditcommunity.example.com/",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(admin);

  // Create a new system configuration entry
  const configName = `config_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = RandomGenerator.alphabets(10);
  const configDescription = "Automated test configuration entry.";

  const createdConfig: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.create(
      connection,
      {
        body: {
          name: configName,
          value: configValue,
          description: configDescription,
        } satisfies IRedditCommunitySystemConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);

  // Validate created configuration matches input
  TestValidator.equals(
    "configuration name matches",
    createdConfig.name,
    configName,
  );
  TestValidator.equals(
    "configuration value matches",
    createdConfig.value,
    configValue,
  );
  TestValidator.equals(
    "configuration description matches",
    createdConfig.description ?? null,
    configDescription,
  );

  // Retrieve the same configuration by name
  const retrievedConfig: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.at(
      connection,
      {
        name: configName,
      },
    );
  typia.assert(retrievedConfig);

  // Validate retrieved config matches created config
  TestValidator.equals(
    "retrieved config id matches",
    retrievedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "retrieved config name matches",
    retrievedConfig.name,
    configName,
  );
  TestValidator.equals(
    "retrieved config value matches",
    retrievedConfig.value,
    configValue,
  );
  TestValidator.equals(
    "retrieved config description matches",
    retrievedConfig.description ?? null,
    configDescription,
  );

  // Additional validation: timestamps are strings (ISO 8601 date-time format)
  TestValidator.predicate(
    "created_at is iso string",
    typeof retrievedConfig.created_at === "string" &&
      !isNaN(Date.parse(retrievedConfig.created_at)),
  );
  TestValidator.predicate(
    "updated_at is iso string",
    typeof retrievedConfig.updated_at === "string" &&
      !isNaN(Date.parse(retrievedConfig.updated_at)),
  );
  // deleted_at is nullable string
  if (
    retrievedConfig.deleted_at !== null &&
    retrievedConfig.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is iso string",
      typeof retrievedConfig.deleted_at === "string" &&
        !isNaN(Date.parse(retrievedConfig.deleted_at)),
    );
  }
}
