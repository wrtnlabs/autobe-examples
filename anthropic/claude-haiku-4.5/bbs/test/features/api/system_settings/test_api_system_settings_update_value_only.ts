import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test updating only the settingValue of an existing system setting.
 *
 * A moderator first creates a setting with settingKey='site_name' and
 * settingValue='Old Site Name'. Then updates just the value to 'New Site Name'
 * while keeping settingType='string' and other fields unchanged. Validates that
 * partial updates work correctly for modifying configuration values.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account
 * 2. Create an initial system setting with key and value
 * 3. Perform partial update of only the settingValue
 * 4. Verify the updated setting matches expected values
 * 5. Confirm immutable fields remain unchanged
 */
export async function test_api_system_settings_update_value_only(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create an initial system setting with specific key and old value
  const settingKey = "site_name";
  const oldValue = "Old Site Name";
  const newValue = "New Site Name";

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: settingKey,
          settingValue: oldValue,
          settingType: "string",
          description: "Website name displayed to users",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);

  // Verify the initial setting was created correctly
  TestValidator.equals(
    "created setting has correct key",
    createdSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "created setting has old value",
    createdSetting.settingValue,
    oldValue,
  );
  TestValidator.equals(
    "created setting has correct type",
    createdSetting.settingType,
    "string",
  );
  TestValidator.equals(
    "created setting is active",
    createdSetting.isActive,
    true,
  );

  // Store original timestamps and metadata
  const originalCreatedAt = createdSetting.createdAt;
  const originalId = createdSetting.id;

  // 3. Perform partial update of only the settingValue
  const updatedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.update(
      connection,
      {
        settingKey: settingKey,
        body: {
          settingValue: newValue,
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedSetting);

  // 4. Verify the updated setting has new value and correct properties
  TestValidator.equals(
    "updated setting has correct key",
    updatedSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "updated setting has new value",
    updatedSetting.settingValue,
    newValue,
  );
  TestValidator.equals(
    "updated setting maintains string type",
    updatedSetting.settingType,
    "string",
  );
  TestValidator.equals(
    "updated setting remains active",
    updatedSetting.isActive,
    true,
  );

  // 5. Verify immutable fields remain unchanged
  TestValidator.equals(
    "setting id remains unchanged",
    updatedSetting.id,
    originalId,
  );
  TestValidator.equals(
    "setting createdAt remains unchanged",
    updatedSetting.createdAt,
    originalCreatedAt,
  );

  // 6. Confirm updatedAt timestamp has been updated
  TestValidator.predicate(
    "updatedAt is updated",
    updatedSetting.updatedAt >= createdSetting.updatedAt,
  );

  // 7. Verify that other fields like description are preserved or remain as expected
  TestValidator.equals(
    "setting type remains string after partial update",
    updatedSetting.settingType,
    createdSetting.settingType,
  );
}
