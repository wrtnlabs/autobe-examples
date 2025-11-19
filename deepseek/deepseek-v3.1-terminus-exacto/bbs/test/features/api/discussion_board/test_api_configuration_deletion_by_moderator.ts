import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the deletion of a discussion board configuration setting by an
 * authenticated moderator.
 *
 * This test validates that moderators can permanently remove configuration
 * settings that are no longer needed. The scenario involves creating a
 * moderator account, creating a configuration setting, and then deleting it.
 * The test verifies that the configuration is successfully removed from the
 * system and cannot be accessed after deletion.
 */
export async function test_api_configuration_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create a moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: "securePassword123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        moderation_level: "admin",
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a configuration setting to be deleted
  const configKey = RandomGenerator.alphaNumeric(10);
  const configuration: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.moderator.configurations.create(
      connection,
      {
        body: {
          config_key: configKey,
          config_value: "true",
          config_type: "boolean",
          description: "Test configuration for deletion validation",
        } satisfies IDiscussionBoardConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  TestValidator.equals(
    "configuration key matches",
    configuration.config_key,
    configKey,
  );

  // 3. Delete the configuration setting
  await api.functional.discussionBoard.moderator.configurations.erase(
    connection,
    {
      configKey: configKey,
    },
  );

  // 4. Verify deletion by attempting to recreate the same configuration
  // This might fail if the system doesn't allow duplicate config keys
  await TestValidator.error(
    "creating duplicate configuration after deletion should fail",
    async () => {
      await api.functional.discussionBoard.moderator.configurations.create(
        connection,
        {
          body: {
            config_key: configKey,
            config_value: "false",
            config_type: "boolean",
            description: "Attempt to recreate deleted configuration",
          } satisfies IDiscussionBoardConfiguration.ICreate,
        },
      );
    },
  );

  // 5. Additional verification - attempt to delete the same configuration again
  // This should also fail since the configuration no longer exists
  await TestValidator.error(
    "deleting already deleted configuration should fail",
    async () => {
      await api.functional.discussionBoard.moderator.configurations.erase(
        connection,
        {
          configKey: configKey,
        },
      );
    },
  );
}
