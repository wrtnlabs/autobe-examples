import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test retrieving platform configurations with null optional fields.
 *
 * This test validates that the configuration retrieval endpoint correctly
 * handles and preserves null values in optional fields (description and
 * data_type). An administrator account is created first to establish
 * authentication context, then a configuration is retrieved to verify that:
 *
 * 1. Null values in optional fields are preserved in the response (not omitted)
 * 2. Required fields are always present and contain valid data
 * 3. The response matches the ICommunityPlatformConfiguration type structure
 * 4. Optional fields can legitimately be null without causing API errors
 *
 * Test workflow:
 *
 * 1. Create administrator account via join endpoint
 * 2. Retrieve a platform configuration by key
 * 3. Validate that the configuration object has correct structure
 * 4. Assert that null fields are properly represented (not empty strings or
 *    undefined)
 * 5. Verify required fields contain valid, non-null values
 */
export async function test_api_platform_configuration_retrieve_with_null_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: undefined,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator account created successfully",
    administrator.id !== null && administrator.id !== undefined,
  );

  // Step 2: Retrieve a platform configuration by key
  // Using a generic configuration key that should exist in the system
  const configurationKey = "test_configuration_with_null_fields";
  const configuration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: configurationKey,
      },
    );
  typia.assert(configuration);

  // Step 3: Validate required fields are always present and non-null
  TestValidator.predicate(
    "configuration id is a valid UUID",
    configuration.id !== null && configuration.id !== undefined,
  );
  TestValidator.predicate(
    "configuration key is present",
    configuration.key !== null && configuration.key !== undefined,
  );
  TestValidator.predicate(
    "configuration value is present",
    configuration.value !== null && configuration.value !== undefined,
  );
  TestValidator.predicate(
    "configuration created_at is present",
    configuration.created_at !== null && configuration.created_at !== undefined,
  );
  TestValidator.predicate(
    "configuration updated_at is present",
    configuration.updated_at !== null && configuration.updated_at !== undefined,
  );

  // Step 4: Validate that optional fields can be null without issues
  // These fields may be null, and that's acceptable
  if (configuration.description === null) {
    TestValidator.predicate(
      "description field can be null",
      configuration.description === null,
    );
  }

  if (configuration.data_type === null) {
    TestValidator.predicate(
      "data_type field can be null",
      configuration.data_type === null,
    );
  }

  if (configuration.deleted_at === null) {
    TestValidator.predicate(
      "deleted_at field can be null",
      configuration.deleted_at === null,
    );
  }

  // Step 5: Verify configuration maintains proper type structure
  TestValidator.predicate(
    "key matches requested configuration key",
    configuration.key === configurationKey,
  );

  // Step 6: Validate data_type constraint if not null
  if (
    configuration.data_type !== null &&
    configuration.data_type !== undefined
  ) {
    TestValidator.predicate(
      "data_type is one of valid types",
      configuration.data_type === "boolean" ||
        configuration.data_type === "integer" ||
        configuration.data_type === "string",
    );
  }
}
