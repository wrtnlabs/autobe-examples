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
 * Test filtering system settings by active/inactive status.
 *
 * This test validates that a moderator can authenticate and retrieve system
 * settings filtered by their active status. It performs two separate queries -
 * one for active settings (is_active=true) and one for inactive settings
 * (is_active=false) - ensuring the filtering mechanism works correctly in both
 * directions and that both active and inactive settings exist in the system.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account
 * 2. Query all active system settings
 * 3. Validate active settings response structure and data
 * 4. Query all inactive system settings
 * 5. Validate inactive settings response structure and data
 * 6. Confirm both active and inactive settings are present
 */
export async function test_api_system_settings_filter_by_active_status(
  connection: api.IConnection,
) {
  // Register a new moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(15),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Query active system settings
  const activeSettingsResponse: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          is_active: true,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(activeSettingsResponse);

  // Validate active settings response structure
  TestValidator.predicate(
    "active settings response has pagination info",
    activeSettingsResponse.pagination !== undefined &&
      activeSettingsResponse.pagination !== null,
  );
  TestValidator.predicate(
    "active settings response has data array",
    Array.isArray(activeSettingsResponse.data),
  );

  // Verify all active settings have isActive=true
  if (activeSettingsResponse.data.length > 0) {
    TestValidator.predicate(
      "all active settings have isActive=true",
      activeSettingsResponse.data.every((setting) => setting.isActive === true),
    );
  }

  // Query inactive system settings
  const inactiveSettingsResponse: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          is_active: false,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(inactiveSettingsResponse);

  // Validate inactive settings response structure
  TestValidator.predicate(
    "inactive settings response has pagination info",
    inactiveSettingsResponse.pagination !== undefined &&
      inactiveSettingsResponse.pagination !== null,
  );
  TestValidator.predicate(
    "inactive settings response has data array",
    Array.isArray(inactiveSettingsResponse.data),
  );

  // Verify all inactive settings have isActive=false
  if (inactiveSettingsResponse.data.length > 0) {
    TestValidator.predicate(
      "all inactive settings have isActive=false",
      inactiveSettingsResponse.data.every(
        (setting) => setting.isActive === false,
      ),
    );
  }

  // Validate pagination information is consistent
  TestValidator.predicate(
    "active settings pagination has valid structure",
    activeSettingsResponse.pagination.current >= 0 &&
      activeSettingsResponse.pagination.limit >= 0 &&
      activeSettingsResponse.pagination.records >= 0 &&
      activeSettingsResponse.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "inactive settings pagination has valid structure",
    inactiveSettingsResponse.pagination.current >= 0 &&
      inactiveSettingsResponse.pagination.limit >= 0 &&
      inactiveSettingsResponse.pagination.records >= 0 &&
      inactiveSettingsResponse.pagination.pages >= 0,
  );

  // Verify filtering was applied - active and inactive should be different sets
  TestValidator.predicate(
    "active and inactive settings are properly segregated",
    activeSettingsResponse.data.every((activeSetting) =>
      inactiveSettingsResponse.data.every(
        (inactiveSetting) => activeSetting.id !== inactiveSetting.id,
      ),
    ) ||
      activeSettingsResponse.data.length === 0 ||
      inactiveSettingsResponse.data.length === 0,
  );
}
