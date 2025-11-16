import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test updating both settingType and settingValue of an existing system
 * setting.
 *
 * This test validates the scenario where a moderator creates a system setting
 * with an initial type and value, then updates both the type and value to
 * enable different application parsing and handling logic. The test ensures
 * that:
 *
 * 1. Moderator account creation and authentication works
 * 2. Initial setting creation with string type succeeds
 * 3. Setting type conversion from string to integer succeeds
 * 4. Updated setting reflects both new type and value correctly
 *
 * This is a realistic scenario where configuration management requires changing
 * how values are interpreted by the application (e.g., from text to numeric).
 */
export async function test_api_system_settings_update_type_and_value(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator should be created with active status",
    moderator.moderator.account_status,
    "active",
  );

  // Step 2: Create an initial system setting with string type and numeric value
  const settingKey = `test_numeric_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = "100";

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey: settingKey,
          settingValue: initialValue,
          settingType: "string",
          description: "Test setting for type conversion",
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(createdSetting);
  TestValidator.equals(
    "initial setting should have string type",
    createdSetting.settingType,
    "string",
  );
  TestValidator.equals(
    "initial setting should have correct value",
    createdSetting.settingValue,
    initialValue,
  );
  TestValidator.equals(
    "initial setting should be active",
    createdSetting.isActive,
    true,
  );

  // Step 3: Update the setting to change type from string to integer
  const updatedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.update(
      connection,
      {
        settingKey: settingKey,
        body: {
          settingType: "integer",
          settingValue: "100",
        } satisfies IDiscussionBoardSystemSetting.IUpdate,
      },
    );
  typia.assert(updatedSetting);
  TestValidator.equals(
    "updated setting should have integer type",
    updatedSetting.settingType,
    "integer",
  );
  TestValidator.equals(
    "updated setting should preserve the numeric value",
    updatedSetting.settingValue,
    "100",
  );
  TestValidator.equals(
    "updated setting should have same key",
    updatedSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "updated setting should remain active",
    updatedSetting.isActive,
    true,
  );
  TestValidator.predicate(
    "updated timestamp should be after creation timestamp",
    new Date(updatedSetting.updatedAt).getTime() >=
      new Date(createdSetting.createdAt).getTime(),
  );
}
