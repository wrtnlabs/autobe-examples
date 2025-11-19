import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test updating a configuration that does not exist.
 *
 * This test validates that the system properly handles attempts to update
 * non-existent configuration keys by returning appropriate error responses. It
 * ensures that the system checks for configuration existence before attempting
 * updates and provides clear error messaging for invalid configuration keys.
 *
 * Steps:
 *
 * 1. Authenticate as moderator to establish proper authorization
 * 2. Generate a random configuration key that does not exist in the system
 * 3. Attempt to update the non-existent configuration with valid update data
 * 4. Validate that the API call fails with appropriate error handling
 */
export async function test_api_configuration_update_nonexistent_key(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      moderation_level: "basic",
      ip: "127.0.0.1",
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Generate a unique random configuration key that does not exist
  const nonExistentConfigKey = `non_existent_${RandomGenerator.alphaNumeric(12)}`;

  // Step 3: Attempt to update non-existent configuration
  await TestValidator.error(
    "updating non-existent configuration should fail",
    async () => {
      await api.functional.discussionBoard.moderator.configurations.update(
        connection,
        {
          configKey: nonExistentConfigKey,
          body: {
            config_value: "updated_value",
            config_type: "string",
            description: "Updated description for non-existent config",
          } satisfies IDiscussionBoardConfiguration.IUpdate,
        },
      );
    },
  );
}
