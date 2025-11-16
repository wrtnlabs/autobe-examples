import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

export async function test_api_system_setting_retrieve_boolean_type(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorCreate = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderatorAuth);

  // 2. Retrieve a boolean-type system setting
  // Using a common boolean setting key like 'enable_comments'
  const settingKey = "enable_comments";
  const setting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.at(
      connection,
      {
        settingKey,
      },
    );
  typia.assert(setting);

  // 3. Validate that the setting is of boolean type
  TestValidator.equals(
    "setting type should be boolean",
    setting.settingType,
    "boolean",
  );

  // 4. Validate that setting_value is either 'true' or 'false' as string
  TestValidator.predicate(
    "setting value should be 'true' or 'false' string",
    setting.settingValue === "true" || setting.settingValue === "false",
  );

  // 5. Validate the setting key matches what was requested
  TestValidator.equals(
    "setting key should match requested key",
    setting.settingKey,
    settingKey,
  );

  // 6. Validate that is_active is a boolean
  TestValidator.predicate(
    "is_active should be boolean",
    typeof setting.isActive === "boolean",
  );

  // 7. Validate timestamps are properly formatted
  TestValidator.predicate(
    "created_at should be valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(setting.createdAt),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(setting.updatedAt),
  );
}
