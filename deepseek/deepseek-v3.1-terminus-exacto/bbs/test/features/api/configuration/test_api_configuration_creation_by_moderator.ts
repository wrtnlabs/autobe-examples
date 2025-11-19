import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the creation of a new configuration setting by an authenticated
 * moderator.
 *
 * This test validates that moderators can successfully create configuration
 * settings with proper authentication, unique key validation, and correct value
 * type handling. The test verifies that the configuration is created with all
 * required fields and that system-generated fields are properly populated.
 *
 * Steps:
 *
 * 1. Authenticate as a moderator to establish authorization context
 * 2. Create a configuration setting with valid data
 * 3. Validate the response contains all required fields
 * 4. Verify system-generated fields are properly populated
 */
export async function test_api_configuration_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(),
      password: "testPassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "admin",
      ip: "192.168.1.1",
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create configuration setting
  const configurationData = {
    config_key: `test_config_${RandomGenerator.alphaNumeric(8)}`,
    config_value: "true",
    config_type: "boolean",
    description: "Test configuration setting for moderation features",
  } satisfies IDiscussionBoardConfiguration.ICreate;

  const configuration =
    await api.functional.discussionBoard.moderator.configurations.create(
      connection,
      {
        body: configurationData,
      },
    );
  typia.assert(configuration);

  // Step 3: Validate all required fields match input data
  TestValidator.equals(
    "config key matches input",
    configuration.config_key,
    configurationData.config_key,
  );
  TestValidator.equals(
    "config value matches input",
    configuration.config_value,
    configurationData.config_value,
  );
  TestValidator.equals(
    "config type matches input",
    configuration.config_type,
    configurationData.config_type,
  );
  TestValidator.equals(
    "description matches input",
    configuration.description,
    configurationData.description,
  );

  // Step 4: Verify system-generated fields are properly populated
  TestValidator.notEquals("id should not be null", configuration.id, null);
  TestValidator.notEquals(
    "created_at should not be null",
    configuration.created_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at should not be null",
    configuration.updated_at,
    null,
  );
}
