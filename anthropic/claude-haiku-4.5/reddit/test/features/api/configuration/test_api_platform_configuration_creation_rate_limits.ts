import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of integer-type configurations for rate limiting parameters.
 *
 * This test validates that platform administrators can create rate limit
 * configurations with integer data types and that these configurations are
 * properly stored and can be retrieved with correct type specifications. The
 * test ensures:
 *
 * 1. Administrator can authenticate and establish authorization
 * 2. Integer-type configurations (max_posts_per_hour, max_comments_per_day) are
 *    created
 * 3. Configuration values are correctly stored as integers
 * 4. Data type specification ensures proper parsing as integers
 * 5. Configurations are accessible for rate-limiting logic
 *
 * Test flow:
 *
 * 1. Administrator joins the platform
 * 2. Create first rate limit configuration (max_posts_per_hour = 24)
 * 3. Create second rate limit configuration (max_comments_per_day = 500)
 * 4. Verify both configurations are stored with integer data types
 * 5. Validate configuration structure and values
 */
export async function test_api_platform_configuration_creation_rate_limits(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.alphaNumeric(8);
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
    "administrator account created successfully",
    administrator.id !== null && administrator.id !== undefined,
  );

  // Step 2: Create first rate limit configuration (max_posts_per_hour)
  const maxPostsPerHourConfig =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "max_posts_per_hour",
          value: "24",
          description: "Maximum number of posts allowed per hour",
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(maxPostsPerHourConfig);

  TestValidator.equals(
    "max_posts_per_hour configuration key matches",
    maxPostsPerHourConfig.key,
    "max_posts_per_hour",
  );
  TestValidator.equals(
    "max_posts_per_hour configuration value is 24",
    maxPostsPerHourConfig.value,
    "24",
  );
  TestValidator.equals(
    "max_posts_per_hour data type is integer",
    maxPostsPerHourConfig.data_type,
    "integer",
  );
  TestValidator.predicate(
    "max_posts_per_hour configuration has valid ID",
    maxPostsPerHourConfig.id !== null && maxPostsPerHourConfig.id !== undefined,
  );

  // Step 3: Create second rate limit configuration (max_comments_per_day)
  const maxCommentsPerDayConfig =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "max_comments_per_day",
          value: "500",
          description: "Maximum number of comments allowed per day",
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(maxCommentsPerDayConfig);

  TestValidator.equals(
    "max_comments_per_day configuration key matches",
    maxCommentsPerDayConfig.key,
    "max_comments_per_day",
  );
  TestValidator.equals(
    "max_comments_per_day configuration value is 500",
    maxCommentsPerDayConfig.value,
    "500",
  );
  TestValidator.equals(
    "max_comments_per_day data type is integer",
    maxCommentsPerDayConfig.data_type,
    "integer",
  );
  TestValidator.predicate(
    "max_comments_per_day configuration has valid ID",
    maxCommentsPerDayConfig.id !== null &&
      maxCommentsPerDayConfig.id !== undefined,
  );

  // Step 4: Verify configurations are different
  TestValidator.notEquals(
    "two rate limit configurations have different IDs",
    maxPostsPerHourConfig.id,
    maxCommentsPerDayConfig.id,
  );

  // Step 5: Validate that integer values can be parsed correctly
  const postsLimitValue = parseInt(maxPostsPerHourConfig.value, 10);
  const commentsLimitValue = parseInt(maxCommentsPerDayConfig.value, 10);

  TestValidator.equals(
    "max_posts_per_hour value parses to integer 24",
    postsLimitValue,
    24,
  );
  TestValidator.equals(
    "max_comments_per_day value parses to integer 500",
    commentsLimitValue,
    500,
  );

  // Step 6: Validate configurations have timestamp information
  TestValidator.predicate(
    "max_posts_per_hour configuration has creation timestamp",
    maxPostsPerHourConfig.created_at !== null &&
      maxPostsPerHourConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "max_comments_per_day configuration has update timestamp",
    maxCommentsPerDayConfig.updated_at !== null &&
      maxCommentsPerDayConfig.updated_at !== undefined,
  );
}
