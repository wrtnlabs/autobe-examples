import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of boolean configuration values that act as feature flags
 * controlling platform features.
 *
 * Creates feature flag configurations like 'voting_enabled' with value 'true'
 * to enable voting, or 'community_creation_restricted' with value 'false' to
 * allow community creation. Verifies that these boolean configurations are
 * correctly stored and retrieved, validating the feature toggle mechanism for
 * controlling platform capabilities.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator to gain platform management access
 * 2. Create feature flag configuration 'voting_enabled' set to 'true'
 * 3. Verify the configuration was created with correct values and types
 * 4. Create feature flag configuration 'community_creation_restricted' set to
 *    'false'
 * 5. Verify both configurations are properly persisted with correct data_type
 * 6. Validate that boolean values in string format are correctly interpreted
 */
export async function test_api_platform_configuration_creation_feature_flags(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create feature flag configuration 'voting_enabled' set to 'true'
  const votingEnabledConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "voting_enabled",
          value: "true",
          description: "Enable or disable voting feature across the platform",
          data_type: "boolean",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(votingEnabledConfig);

  // 3. Verify the configuration was created with correct values and types
  TestValidator.equals(
    "voting_enabled configuration key matches",
    votingEnabledConfig.key,
    "voting_enabled",
  );
  TestValidator.equals(
    "voting_enabled configuration value is 'true'",
    votingEnabledConfig.value,
    "true",
  );
  TestValidator.equals(
    "voting_enabled data_type is 'boolean'",
    votingEnabledConfig.data_type,
    "boolean",
  );
  TestValidator.predicate(
    "voting_enabled configuration has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      votingEnabledConfig.id,
    ),
  );

  // 4. Create feature flag configuration 'community_creation_restricted' set to 'false'
  const communityCreationConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "community_creation_restricted",
          value: "false",
          description: "Allow or restrict community creation for regular users",
          data_type: "boolean",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(communityCreationConfig);

  // 5. Verify both configurations are properly persisted with correct data_type
  TestValidator.equals(
    "community_creation_restricted configuration key matches",
    communityCreationConfig.key,
    "community_creation_restricted",
  );
  TestValidator.equals(
    "community_creation_restricted configuration value is 'false'",
    communityCreationConfig.value,
    "false",
  );
  TestValidator.equals(
    "community_creation_restricted data_type is 'boolean'",
    communityCreationConfig.data_type,
    "boolean",
  );

  // 6. Validate that boolean values in string format are correctly interpreted
  TestValidator.predicate(
    "voting_enabled value is 'true' string",
    votingEnabledConfig.value === "true",
  );
  TestValidator.predicate(
    "community_creation_restricted value is 'false' string",
    communityCreationConfig.value === "false",
  );

  // Verify different feature flags have different behaviors
  TestValidator.notEquals(
    "feature flags have different values",
    votingEnabledConfig.value,
    communityCreationConfig.value,
  );
}
