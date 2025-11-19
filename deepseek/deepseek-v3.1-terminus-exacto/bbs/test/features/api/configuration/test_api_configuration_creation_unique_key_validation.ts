import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_configuration_creation_unique_key_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: "password123",
      moderation_level: "basic",
      href: "https://example.com",
      referrer: "https://example.com/register",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create first configuration with unique key
  const configKey = "max_attachment_size";
  const firstConfig =
    await api.functional.discussionBoard.moderator.configurations.create(
      connection,
      {
        body: {
          config_key: configKey,
          config_value: "10485760",
          config_type: "number",
          description: "Maximum file size for attachments in bytes",
        } satisfies IDiscussionBoardConfiguration.ICreate,
      },
    );
  typia.assert(firstConfig);
  TestValidator.equals(
    "first configuration key matches",
    firstConfig.config_key,
    configKey,
  );

  // Step 3: Attempt to create duplicate configuration (should fail)
  await TestValidator.error(
    "duplicate configuration key should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.configurations.create(
        connection,
        {
          body: {
            config_key: configKey,
            config_value: "20971520",
            config_type: "number",
            description: "Different value for same key",
          } satisfies IDiscussionBoardConfiguration.ICreate,
        },
      );
    },
  );

  // Step 4: Verify normal operation with different key still works
  const secondConfigKey = "session_timeout";
  const secondConfig =
    await api.functional.discussionBoard.moderator.configurations.create(
      connection,
      {
        body: {
          config_key: secondConfigKey,
          config_value: "3600",
          config_type: "number",
          description: "Session timeout duration in seconds",
        } satisfies IDiscussionBoardConfiguration.ICreate,
      },
    );
  typia.assert(secondConfig);
  TestValidator.equals(
    "second configuration key matches",
    secondConfig.config_key,
    secondConfigKey,
  );
  TestValidator.notEquals(
    "configuration IDs should be different",
    firstConfig.id,
    secondConfig.id,
  );
}
