import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

export async function test_api_system_settings_update_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCredentials = {
    email: moderatorEmail,
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCredentials,
    });
  typia.assert(moderatorAuth);

  const moderatorId = moderatorAuth.id;

  // Step 2: Create a system setting to establish initial state
  const settingKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const initialSetting = {
    settingKey: settingKey,
    settingValue: "initial_value",
    settingType: "string",
    description: "Test setting for audit trail verification",
  } satisfies IDiscussionBoardSystemSetting.ICreate;

  const createdSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: initialSetting,
      },
    );
  typia.assert(createdSetting);

  TestValidator.equals(
    "created setting key matches",
    createdSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "created setting value matches",
    createdSetting.settingValue,
    "initial_value",
  );

  // Step 3: Update the system setting and verify audit trail
  const updatedSettingValue = "updated_value";
  const updateData = {
    settingValue: updatedSettingValue,
    settingType: "string",
    description: "Updated description for testing",
    isActive: true,
  } satisfies IDiscussionBoardSystemSetting.IUpdate;

  const updatedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.update(
      connection,
      {
        settingKey: settingKey,
        body: updateData,
      },
    );
  typia.assert(updatedSetting);

  // Step 4: Verify the updatedBy field contains the moderator ID for audit trail
  TestValidator.equals(
    "updatedBy field contains moderator ID",
    updatedSetting.updatedBy,
    moderatorId,
  );

  // Step 5: Verify all updated properties are correctly reflected
  TestValidator.equals(
    "setting key unchanged after update",
    updatedSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "setting value updated correctly",
    updatedSetting.settingValue,
    updatedSettingValue,
  );
  TestValidator.equals(
    "setting type updated correctly",
    updatedSetting.settingType,
    "string",
  );
  TestValidator.equals(
    "isActive flag updated correctly",
    updatedSetting.isActive,
    true,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedSetting.description,
    "Updated description for testing",
  );

  // Step 6: Verify timestamps show update occurred
  TestValidator.predicate(
    "updatedAt timestamp is present",
    updatedSetting.updatedAt !== null && updatedSetting.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "createdAt timestamp is preserved",
    updatedSetting.createdAt !== null && updatedSetting.createdAt !== undefined,
  );
}
