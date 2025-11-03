import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * End-to-end test for creating a redditCommunity system configuration by an
 * admin.
 *
 * This test validates the entire workflow of an admin user joining the system,
 * logging in, then creating a new system configuration with a unique config key
 * and value.
 *
 * This test performs:
 *
 * 1. Admin registration via join endpoint with user ID.
 * 2. Creation of a system configuration with unique key and value.
 * 3. Validation that the returned configuration includes correct IDs and
 *    timestamps.
 *
 * The test asserts all relevant data types and enforces business rules such as
 * uniqueness and proper audit fields.
 */
export async function test_api_redditcommunity_system_configuration_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration (join)
  // Generate or mock a valid user_id (UUID format string assumed from typia.random)
  const user_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Using IRedditCommunityAdmin.ICreate type
  const adminCreateBody = {
    user_id: user_id,
  } satisfies IRedditCommunityAdmin.ICreate;

  // Create admin account via join (post /auth/admin/join)
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Step 2: Create redditCommunity system configuration
  // Prepare a unique config_key and config_value for the system configuration

  // Generate unique config_key - random string
  const configKey = `key_${RandomGenerator.alphaNumeric(8)}`;
  // Config value as a string of random content
  const configValue = `value_${RandomGenerator.alphaNumeric(20)}`;

  // Optionally description set to null explicitly as allowed
  const configDescription: string | null = null;

  // Prepare IRedditCommunitySystemConfiguration.ICreate
  const configCreateBody = {
    config_key: configKey,
    config_value: configValue,
    description: configDescription,
  } satisfies IRedditCommunitySystemConfiguration.ICreate;

  // Call create system configuration API
  const config: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.create(
      connection,
      {
        body: configCreateBody,
      },
    );
  typia.assert(config);

  // Step 3: Validate that returned configuration matches input and contains correct audit fields

  // Validate ID format
  TestValidator.predicate(
    "config id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      config.id,
    ),
  );

  // Validate that config_key and config_value match inputs
  TestValidator.equals("config key matches", config.config_key, configKey);
  TestValidator.equals(
    "config value matches",
    config.config_value,
    configValue,
  );

  // Description field check (may be null or string)
  TestValidator.equals(
    "config description matches",
    config.description,
    configDescription,
  );

  // Check created_at and updated_at are ISO date-time strings
  TestValidator.predicate(
    "created_at is ISO8601 date-time",
    typeof config.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        config.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO8601 date-time",
    typeof config.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        config.updated_at,
      ),
  );
}
