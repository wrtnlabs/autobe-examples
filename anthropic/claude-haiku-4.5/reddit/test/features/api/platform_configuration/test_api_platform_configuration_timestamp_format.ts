import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that platform configuration timestamps are returned in correct ISO
 * 8601 format.
 *
 * Administrator creates an account and retrieves platform configurations. The
 * test validates that created_at and updated_at fields are formatted as ISO
 * 8601 datetime strings (e.g., '2025-01-15T10:30:45Z'). Confirms the timestamps
 * follow the correct pattern and can be parsed as valid ISO datetime values.
 * Tests that updated_at timestamp is always greater than or equal to created_at
 * timestamp for each configuration.
 *
 * Test steps:
 *
 * 1. Create administrator account via join endpoint
 * 2. Retrieve configuration by key
 * 3. Validate created_at timestamp format and parsing
 * 4. Validate updated_at timestamp format and parsing
 * 5. Verify updated_at >= created_at
 * 6. Validate ISO 8601 datetime pattern matching
 */
export async function test_api_platform_configuration_timestamp_format(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminCreated = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminCreated);

  // Step 2: Retrieve a platform configuration
  const configKey = "max_posts_per_hour";
  const configuration =
    await api.functional.communityPlatform.administrator.configurations.at(
      connection,
      {
        configurationKey: configKey,
      },
    );
  typia.assert(configuration);

  // Step 3: Validate created_at timestamp format
  TestValidator.predicate(
    "created_at is a non-empty string",
    typeof configuration.created_at === "string" &&
      configuration.created_at.length > 0,
  );

  // ISO 8601 datetime pattern validation
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  TestValidator.predicate(
    "created_at matches ISO 8601 format pattern",
    iso8601Pattern.test(configuration.created_at),
  );

  // Parse created_at as valid Date
  const createdAtDate = new Date(configuration.created_at);
  TestValidator.predicate(
    "created_at can be parsed as valid ISO datetime",
    !isNaN(createdAtDate.getTime()),
  );

  // Step 4: Validate updated_at timestamp format
  TestValidator.predicate(
    "updated_at is a non-empty string",
    typeof configuration.updated_at === "string" &&
      configuration.updated_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at matches ISO 8601 format pattern",
    iso8601Pattern.test(configuration.updated_at),
  );

  // Parse updated_at as valid Date
  const updatedAtDate = new Date(configuration.updated_at);
  TestValidator.predicate(
    "updated_at can be parsed as valid ISO datetime",
    !isNaN(updatedAtDate.getTime()),
  );

  // Step 5: Verify temporal relationship between timestamps
  TestValidator.predicate(
    "updated_at is greater than or equal to created_at",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );

  // Step 6: If deleted_at exists, validate its format too
  if (
    configuration.deleted_at !== null &&
    configuration.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is a non-empty string when present",
      typeof configuration.deleted_at === "string" &&
        configuration.deleted_at.length > 0,
    );

    TestValidator.predicate(
      "deleted_at matches ISO 8601 format pattern",
      iso8601Pattern.test(configuration.deleted_at),
    );

    const deletedAtDate = new Date(configuration.deleted_at);
    TestValidator.predicate(
      "deleted_at can be parsed as valid ISO datetime",
      !isNaN(deletedAtDate.getTime()),
    );

    TestValidator.predicate(
      "deleted_at is greater than or equal to updated_at",
      deletedAtDate.getTime() >= updatedAtDate.getTime(),
    );
  }
}
