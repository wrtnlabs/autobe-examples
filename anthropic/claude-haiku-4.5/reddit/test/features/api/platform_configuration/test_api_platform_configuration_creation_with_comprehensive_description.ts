import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of platform configurations with comprehensive descriptions.
 *
 * This test validates that administrators can create platform configurations
 * with detailed human-readable descriptions that explain the configuration's
 * purpose and impact. The test verifies that comprehensive descriptions are
 * properly stored and returned in the configuration response, helping
 * administrators understand the setting's implications.
 *
 * Test Flow:
 *
 * 1. Create administrator account and obtain authentication tokens
 * 2. Create a platform configuration with a comprehensive multi-line description
 * 3. Verify configuration creation succeeds with all details
 * 4. Validate that the description is properly stored and returned
 * 5. Confirm configuration can be used in configuration management interfaces
 */
export async function test_api_platform_configuration_creation_with_comprehensive_description(
  connection: api.IConnection,
) {
  // Step 1: Authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name();
  const adminHref = typia.random<string & tags.Format<"uri">>();

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: adminHref,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator authenticated successfully",
    administrator.email === adminEmail,
  );

  // Step 2: Create configuration with comprehensive description
  const configKey = `max_posts_per_hour_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = "100";
  const configDataType = "integer";

  // Create a comprehensive, detailed description explaining the configuration
  const comprehensiveDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const createdConfiguration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configKey,
          value: configValue,
          description: comprehensiveDescription,
          data_type: configDataType,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfiguration);

  // Step 3: Verify configuration creation
  TestValidator.equals(
    "configuration key matches input",
    createdConfiguration.key,
    configKey,
  );
  TestValidator.equals(
    "configuration value matches input",
    createdConfiguration.value,
    configValue,
  );
  TestValidator.equals(
    "configuration data_type matches input",
    createdConfiguration.data_type,
    configDataType,
  );

  // Step 4: Validate comprehensive description is properly stored
  TestValidator.equals(
    "configuration description stored correctly",
    createdConfiguration.description,
    comprehensiveDescription,
  );
  TestValidator.predicate(
    "description is not empty",
    (createdConfiguration.description?.length ?? 0) > 0,
  );
  TestValidator.predicate(
    "description contains meaningful content",
    (createdConfiguration.description?.split(" ").length ?? 0) > 10,
  );

  // Step 5: Verify configuration metadata
  TestValidator.predicate(
    "configuration id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdConfiguration.id,
    ),
  );
  TestValidator.predicate(
    "created_at timestamp is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      createdConfiguration.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at timestamp is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      createdConfiguration.updated_at,
    ),
  );
  TestValidator.predicate(
    "configuration is not deleted",
    createdConfiguration.deleted_at === null ||
      createdConfiguration.deleted_at === undefined,
  );
}
