import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

/**
 * Test creation of a system setting with boolean data type.
 *
 * A moderator creates a feature flag with
 * settingKey='enable_new_user_registrations', settingValue='true', and
 * settingType='boolean'. The setting represents a platform feature toggle that
 * controls whether new users can register. Validates that boolean settings are
 * correctly created and can be reliably parsed by the application for feature
 * control.
 *
 * Process:
 *
 * 1. Register a moderator account to establish authentication
 * 2. Create a boolean system setting for user registration control
 * 3. Validate the created setting has correct values and type
 * 4. Verify the setting is active and properly stored
 */
export async function test_api_system_settings_creation_with_boolean_type(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string &
    tags.MinLength<3> &
    tags.MaxLength<30> &
    tags.Pattern<"^[a-zA-Z0-9_-]+$"> = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const moderatorPassword: string & tags.MinLength<8> = "Password123!";
  const moderatorDisplayName: string & tags.MinLength<1> & tags.MaxLength<100> =
    RandomGenerator.name();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a boolean system setting
  const settingKey = "enable_new_user_registrations";
  const settingValue = "true";
  const settingType = "boolean";
  const description = "Controls whether new users can register on the platform";

  const booleanSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.create(
      connection,
      {
        body: {
          settingKey,
          settingValue,
          settingType,
          description,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(booleanSetting);

  // Step 3: Validate the created setting has correct values and type
  TestValidator.equals(
    "created setting key matches input",
    booleanSetting.settingKey,
    settingKey,
  );
  TestValidator.equals(
    "created setting value matches input",
    booleanSetting.settingValue,
    settingValue,
  );
  TestValidator.equals(
    "created setting type is boolean",
    booleanSetting.settingType,
    settingType,
  );
  TestValidator.equals(
    "created setting description matches input",
    booleanSetting.description,
    description,
  );

  // Step 4: Verify the setting is active and properly stored
  TestValidator.predicate(
    "setting is active by default",
    booleanSetting.isActive === true,
  );
}
