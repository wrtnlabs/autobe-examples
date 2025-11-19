import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test updating an existing configuration setting by an authenticated
 * moderator. Validates that moderators can modify configuration values, types,
 * and descriptions while maintaining data integrity. Tests partial updates
 * (modifying specific fields) and ensures system-generated fields like
 * updated_at are properly refreshed while created_at remains unchanged.
 */
export async function test_api_configuration_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.paragraph({ sentences: 2 }),
      password: "password123",
      display_name: RandomGenerator.paragraph({ sentences: 1 }),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "basic",
      ip: "192.168.1.1",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create initial configuration
  const initialConfig =
    await api.functional.discussionBoard.moderator.configurations.create(
      connection,
      {
        body: {
          config_key: "max_attachment_size",
          config_value: "10485760", // 10MB
          config_type: "number",
          description: "Maximum allowed attachment file size in bytes",
        } satisfies IDiscussionBoardConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);

  // 3. Perform partial update - modify only config_value
  const partialUpdate =
    await api.functional.discussionBoard.moderator.configurations.update(
      connection,
      {
        configKey: initialConfig.config_key,
        body: {
          config_value: "20971520", // 20MB
        } satisfies IDiscussionBoardConfiguration.IUpdate,
      },
    );
  typia.assert(partialUpdate);

  // Validate partial update results
  TestValidator.equals(
    "config_key should remain unchanged after partial update",
    partialUpdate.config_key,
    initialConfig.config_key,
  );
  TestValidator.equals(
    "config_value should be updated",
    partialUpdate.config_value,
    "20971520",
  );
  TestValidator.equals(
    "config_type should remain unchanged",
    partialUpdate.config_type,
    initialConfig.config_type,
  );
  TestValidator.equals(
    "description should remain unchanged",
    partialUpdate.description,
    initialConfig.description,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    partialUpdate.created_at,
    initialConfig.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be refreshed after partial update",
    partialUpdate.updated_at,
    initialConfig.updated_at,
  );

  // 4. Perform full update - modify all fields
  const fullUpdate =
    await api.functional.discussionBoard.moderator.configurations.update(
      connection,
      {
        configKey: initialConfig.config_key,
        body: {
          config_value: "31457280", // 30MB
          config_type: "string",
          description: "Updated maximum attachment size with new type",
        } satisfies IDiscussionBoardConfiguration.IUpdate,
      },
    );
  typia.assert(fullUpdate);

  // Validate full update results
  TestValidator.equals(
    "config_key should remain unchanged after full update",
    fullUpdate.config_key,
    initialConfig.config_key,
  );
  TestValidator.equals(
    "config_value should be updated",
    fullUpdate.config_value,
    "31457280",
  );
  TestValidator.equals(
    "config_type should be updated",
    fullUpdate.config_type,
    "string",
  );
  TestValidator.equals(
    "description should be updated",
    fullUpdate.description,
    "Updated maximum attachment size with new type",
  );
  TestValidator.equals(
    "created_at should remain unchanged across all updates",
    fullUpdate.created_at,
    initialConfig.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be refreshed after full update",
    fullUpdate.updated_at,
    partialUpdate.updated_at,
  );
}
