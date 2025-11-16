import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";

/**
 * Test filtering system settings by setting_type.
 *
 * This test validates that moderators can filter system configuration settings
 * by their data type (string, integer, boolean, or json). The test establishes
 * a moderator authentication context, then queries the system settings endpoint
 * with different type filters to verify that only settings matching the
 * specified setting_type are returned.
 *
 * The test workflow:
 *
 * 1. Register a new moderator account to establish authentication
 * 2. Filter system settings by setting_type='string' and validate response
 * 3. Filter system settings by setting_type='integer' and validate response
 * 4. Filter system settings by setting_type='boolean' and validate response
 * 5. Filter system settings by setting_type='json' and validate response
 * 6. Verify that each filter returns only settings matching that type
 */
export async function test_api_system_settings_filter_by_type(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);
  TestValidator.equals(
    "moderator authenticated",
    moderatorAuth.token !== null,
    true,
  );

  // 2. Filter system settings by setting_type='string'
  const stringSettingsResponse: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          setting_type: "string",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(stringSettingsResponse);
  TestValidator.predicate(
    "string settings response contains pagination",
    stringSettingsResponse.pagination !== null,
  );

  // Validate all returned settings have type 'string'
  if (stringSettingsResponse.data.length > 0) {
    for (const setting of stringSettingsResponse.data) {
      TestValidator.equals(
        "setting type is string",
        setting.settingType,
        "string",
      );
    }
  }

  // 3. Filter system settings by setting_type='integer'
  const integerSettingsResponse: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          setting_type: "integer",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(integerSettingsResponse);
  TestValidator.predicate(
    "integer settings response contains pagination",
    integerSettingsResponse.pagination !== null,
  );

  // Validate all returned settings have type 'integer'
  if (integerSettingsResponse.data.length > 0) {
    for (const setting of integerSettingsResponse.data) {
      TestValidator.equals(
        "setting type is integer",
        setting.settingType,
        "integer",
      );
    }
  }

  // 4. Filter system settings by setting_type='boolean'
  const booleanSettingsResponse: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          setting_type: "boolean",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(booleanSettingsResponse);
  TestValidator.predicate(
    "boolean settings response contains pagination",
    booleanSettingsResponse.pagination !== null,
  );

  // Validate all returned settings have type 'boolean'
  if (booleanSettingsResponse.data.length > 0) {
    for (const setting of booleanSettingsResponse.data) {
      TestValidator.equals(
        "setting type is boolean",
        setting.settingType,
        "boolean",
      );
    }
  }

  // 5. Filter system settings by setting_type='json'
  const jsonSettingsResponse: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          setting_type: "json",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(jsonSettingsResponse);
  TestValidator.predicate(
    "json settings response contains pagination",
    jsonSettingsResponse.pagination !== null,
  );

  // Validate all returned settings have type 'json'
  if (jsonSettingsResponse.data.length > 0) {
    for (const setting of jsonSettingsResponse.data) {
      TestValidator.equals("setting type is json", setting.settingType, "json");
    }
  }

  // 6. Verify pagination information is valid
  TestValidator.predicate(
    "string settings pagination is valid",
    stringSettingsResponse.pagination.current >= 0 &&
      stringSettingsResponse.pagination.limit >= 0 &&
      stringSettingsResponse.pagination.records >= 0 &&
      stringSettingsResponse.pagination.pages >= 0,
  );
}
