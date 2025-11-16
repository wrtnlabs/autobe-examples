import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test that updating a system setting properly updates the updatedAt timestamp
 * while preserving createdAt.
 *
 * This test validates the audit trail functionality for system settings. When a
 * setting is created, both createdAt and updatedAt are set to the same initial
 * time. When the setting is subsequently updated, the createdAt timestamp
 * should remain unchanged while updatedAt should be updated to reflect the
 * modification time. This ensures complete audit history of configuration
 * changes.
 *
 * Test flow:
 *
 * 1. Register a moderator account and authenticate
 * 2. Create a system setting with initial value
 * 3. Record the initial createdAt and updatedAt timestamps
 * 4. Wait a brief moment to ensure time passes
 * 5. Update the setting with new value
 * 6. Verify that createdAt remains unchanged
 * 7. Verify that updatedAt has been updated to a later time
 * 8. Confirm the new setting value is persisted
 */
export async function test_api_system_settings_update_timestamps(
  connection: api.IConnection,
) {
  // 1. Register a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(authorized);

  // 2. Create a system setting with initial value
  const settingKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = "initial_value";
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });

  const createdSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey,
          settingValue: initialValue,
          settingType: "string",
          description: initialDescription,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);

  // 3. Record the initial timestamps
  const initialCreatedAt = createdSetting.createdAt;
  const initialUpdatedAt = createdSetting.updatedAt;

  TestValidator.equals(
    "initial createdAt and updatedAt should be equal",
    initialCreatedAt,
    initialUpdatedAt,
  );

  // 4. Wait a brief moment to ensure time passes
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 5. Update the setting with new value
  const updatedValue = "updated_value";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });

  const updatedSetting =
    await api.functional.discussionBoard.moderator.systemSettings.update(
      connection,
      {
        settingKey,
        body: {
          settingValue: updatedValue,
          settingType: "string",
          description: updatedDescription,
          isActive: true,
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedSetting);

  // 6. Verify that createdAt remains unchanged
  TestValidator.equals(
    "createdAt should remain unchanged after update",
    updatedSetting.createdAt,
    initialCreatedAt,
  );

  // 7. Verify that updatedAt has been updated to a later time
  TestValidator.notEquals(
    "updatedAt should be different after update",
    updatedSetting.updatedAt,
    initialUpdatedAt,
  );

  TestValidator.predicate(
    "updatedAt should be later than initial updatedAt",
    new Date(updatedSetting.updatedAt) > new Date(initialUpdatedAt),
  );

  // 8. Confirm the new setting value is persisted
  TestValidator.equals(
    "setting value should be updated",
    updatedSetting.settingValue,
    updatedValue,
  );

  TestValidator.equals(
    "setting description should be updated",
    updatedSetting.description,
    updatedDescription,
  );
}
