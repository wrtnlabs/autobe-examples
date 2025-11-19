import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test partial field updates for configuration settings.
 *
 * This test validates that the system correctly handles updates where only
 * specific fields are modified, ensuring that omitted fields retain their
 * previous values and the system properly tracks field modifications through
 * timestamp updates.
 */
export async function test_api_configuration_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: "test_moderator",
      password: "securePassword123",
      display_name: "Test Moderator",
      bio: "Test account for configuration management",
      moderation_level: "admin",
      ip: "127.0.0.1",
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create initial configuration for testing
  const initialConfig =
    await api.functional.discussionBoard.moderator.configurations.create(
      connection,
      {
        body: {
          config_key: "test.max_file_size",
          config_value: "10485760",
          config_type: "number",
          description: "Maximum file upload size in bytes",
        } satisfies IDiscussionBoardConfiguration.ICreate,
      },
    );
  typia.assert(initialConfig);

  // Step 3: Perform partial update - modify only description
  const updatedDescription =
    "Updated maximum file upload size in bytes with better description";
  const firstPartialUpdate =
    await api.functional.discussionBoard.moderator.configurations.update(
      connection,
      {
        configKey: initialConfig.config_key,
        body: {
          description: updatedDescription,
        } satisfies IDiscussionBoardConfiguration.IUpdate,
      },
    );
  typia.assert(firstPartialUpdate);

  // Step 4: Verify partial update preserves unchanged fields
  TestValidator.equals(
    "config_key should remain unchanged after description update",
    firstPartialUpdate.config_key,
    initialConfig.config_key,
  );
  TestValidator.equals(
    "config_value should remain unchanged after description update",
    firstPartialUpdate.config_value,
    initialConfig.config_value,
  );
  TestValidator.equals(
    "config_type should remain unchanged after description update",
    firstPartialUpdate.config_type,
    initialConfig.config_type,
  );
  TestValidator.equals(
    "description should be updated",
    firstPartialUpdate.description,
    updatedDescription,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after description update",
    firstPartialUpdate.updated_at,
    initialConfig.updated_at,
  );

  // Step 5: Perform second partial update - modify only config_value
  const secondPartialUpdate =
    await api.functional.discussionBoard.moderator.configurations.update(
      connection,
      {
        configKey: initialConfig.config_key,
        body: {
          config_value: "20971520",
        } satisfies IDiscussionBoardConfiguration.IUpdate,
      },
    );
  typia.assert(secondPartialUpdate);

  // Step 6: Verify second partial update preserves other fields including description
  TestValidator.equals(
    "config_key should remain unchanged after config_value update",
    secondPartialUpdate.config_key,
    initialConfig.config_key,
  );
  TestValidator.equals(
    "config_type should remain unchanged after config_value update",
    secondPartialUpdate.config_type,
    initialConfig.config_type,
  );
  TestValidator.equals(
    "description should remain unchanged after config_value update",
    secondPartialUpdate.description,
    updatedDescription,
  );
  TestValidator.equals(
    "config_value should be updated",
    secondPartialUpdate.config_value,
    "20971520",
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after config_value update",
    secondPartialUpdate.updated_at,
    firstPartialUpdate.updated_at,
  );

  // Step 7: Validate that all immutable fields remain constant
  TestValidator.equals(
    "id should remain constant throughout updates",
    secondPartialUpdate.id,
    initialConfig.id,
  );
  TestValidator.equals(
    "created_at timestamp should remain constant",
    secondPartialUpdate.created_at,
    initialConfig.created_at,
  );
}
