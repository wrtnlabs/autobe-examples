import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creation of platform configurations with threshold values.
 *
 * This test validates the creation of platform-wide threshold configurations
 * that control system behavior and user access capabilities. Configurations
 * like 'min_karma_to_post' and 'minimum_account_age_days' are tested to ensure
 * they are properly stored with correct data types, values, and descriptions.
 *
 * The test workflow:
 *
 * 1. Authenticate as administrator to establish authorization context
 * 2. Create multiple threshold configurations with integer data types
 * 3. Verify configurations are properly stored with all required fields
 * 4. Validate that threshold values are correctly interpreted as specified types
 */
export async function test_api_platform_configuration_creation_threshold_values(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123";
  const adminUsername = RandomGenerator.alphabets(10);
  const adminName = RandomGenerator.name();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin",
        referrer: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin authenticated successfully",
    admin.email,
    adminEmail,
  );

  // Step 2: Create threshold configuration - min_karma_to_post
  const minKarmaConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "min_karma_to_post",
          value: "10",
          description:
            "Minimum karma required for users to create posts. Controls community quality by requiring reputation.",
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(minKarmaConfig);
  TestValidator.equals(
    "min_karma_to_post key matches",
    minKarmaConfig.key,
    "min_karma_to_post",
  );
  TestValidator.equals(
    "min_karma_to_post value stored correctly",
    minKarmaConfig.value,
    "10",
  );
  TestValidator.equals(
    "min_karma_to_post data_type is integer",
    minKarmaConfig.data_type,
    "integer",
  );
  TestValidator.predicate(
    "min_karma_to_post description explains impact",
    minKarmaConfig.description !== null &&
      minKarmaConfig.description !== undefined,
  );

  // Step 3: Create threshold configuration - minimum_account_age_days
  const minAccountAgeConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "minimum_account_age_days",
          value: "7",
          description:
            "Minimum account age in days required to participate in voting and moderation activities.",
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(minAccountAgeConfig);
  TestValidator.equals(
    "minimum_account_age_days key matches",
    minAccountAgeConfig.key,
    "minimum_account_age_days",
  );
  TestValidator.equals(
    "minimum_account_age_days value stored correctly",
    minAccountAgeConfig.value,
    "7",
  );
  TestValidator.equals(
    "minimum_account_age_days data_type is integer",
    minAccountAgeConfig.data_type,
    "integer",
  );
  TestValidator.predicate(
    "minimum_account_age_days description explains impact",
    minAccountAgeConfig.description !== null &&
      minAccountAgeConfig.description !== undefined,
  );

  // Step 4: Create additional threshold configuration - max_posts_per_hour
  const maxPostsPerHourConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "max_posts_per_hour",
          value: "5",
          description:
            "Maximum number of posts a user can create per hour. Prevents spam and rate-limiting abuse.",
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(maxPostsPerHourConfig);
  TestValidator.equals(
    "max_posts_per_hour key matches",
    maxPostsPerHourConfig.key,
    "max_posts_per_hour",
  );
  TestValidator.equals(
    "max_posts_per_hour value stored correctly",
    maxPostsPerHourConfig.value,
    "5",
  );
  TestValidator.equals(
    "max_posts_per_hour data_type is integer",
    maxPostsPerHourConfig.data_type,
    "integer",
  );

  // Step 5: Validate configuration response structure and timestamps
  TestValidator.predicate(
    "minKarmaConfig has valid UUID id",
    minKarmaConfig.id.length === 36 && minKarmaConfig.id.includes("-"),
  );
  TestValidator.predicate(
    "minKarmaConfig has created_at timestamp",
    minKarmaConfig.created_at !== null &&
      minKarmaConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "minKarmaConfig has updated_at timestamp",
    minKarmaConfig.updated_at !== null &&
      minKarmaConfig.updated_at !== undefined,
  );

  // Step 6: Verify multiple configurations have unique IDs
  TestValidator.notEquals(
    "configurations have different IDs",
    minKarmaConfig.id,
    minAccountAgeConfig.id,
  );
  TestValidator.notEquals(
    "configurations have different keys",
    minKarmaConfig.key,
    maxPostsPerHourConfig.key,
  );

  // Step 7: Verify all threshold configurations are active (not deleted)
  TestValidator.predicate(
    "minKarmaConfig is active",
    minKarmaConfig.deleted_at === null ||
      minKarmaConfig.deleted_at === undefined,
  );
  TestValidator.predicate(
    "minAccountAgeConfig is active",
    minAccountAgeConfig.deleted_at === null ||
      minAccountAgeConfig.deleted_at === undefined,
  );
  TestValidator.predicate(
    "maxPostsPerHourConfig is active",
    maxPostsPerHourConfig.deleted_at === null ||
      maxPostsPerHourConfig.deleted_at === undefined,
  );
}
