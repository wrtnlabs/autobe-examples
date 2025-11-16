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
 * Test searching system settings by specific setting_key filter.
 *
 * This test validates the system settings search functionality for moderators.
 * It verifies that when a moderator performs a search query with a setting_key
 * filter, the API correctly filters configuration entries and returns paginated
 * results matching only the specified setting key.
 *
 * The test flow:
 *
 * 1. Register a new moderator account to establish authenticated session
 * 2. Search system settings by a specific setting_key (e.g., 'maintenance_mode')
 * 3. Verify that only settings with matching setting_key are returned
 * 4. Validate pagination metadata is accurate for the filtered results
 * 5. Confirm response structure matches IPageIDiscussionBoardSystemSetting
 */
export async function test_api_system_settings_search_by_key(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderatorCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // 2. Search system settings by a specific setting_key
  const targetSettingKey = "maintenance_mode";
  const searchRequest = {
    page: 1,
    limit: 50,
    setting_key: targetSettingKey,
  } satisfies IDiscussionBoardSystemSetting.IRequest;

  const searchResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // 3. Verify pagination structure
  TestValidator.predicate(
    "pagination object exists",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    searchResult.pagination.pages >= 0,
  );

  // 4. Verify data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );

  // 5. If results are returned, verify they match the filter
  if (searchResult.data.length > 0) {
    for (const setting of searchResult.data) {
      TestValidator.equals(
        "setting matches the filter key",
        setting.settingKey,
        targetSettingKey,
      );
      TestValidator.predicate(
        "setting has valid id",
        setting.id !== null && setting.id !== undefined,
      );
      TestValidator.predicate(
        "setting has value",
        setting.settingValue !== null && setting.settingValue !== undefined,
      );
      TestValidator.predicate(
        "setting has type",
        ["string", "integer", "boolean", "json"].includes(setting.settingType),
      );
      TestValidator.predicate(
        "setting has isActive boolean",
        typeof setting.isActive === "boolean",
      );
    }
  }

  // 6. Verify pagination consistency
  TestValidator.equals(
    "current page matches request",
    searchResult.pagination.current,
    searchRequest.page || 1,
  );
  TestValidator.equals(
    "limit matches request",
    searchResult.pagination.limit,
    searchRequest.limit || 50,
  );

  // 7. Verify data count does not exceed limit
  TestValidator.predicate(
    "data count does not exceed limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );

  // 8. Verify pages calculation
  const expectedPages = Math.ceil(
    searchResult.pagination.records / searchResult.pagination.limit,
  );
  TestValidator.equals(
    "pages count is correct",
    searchResult.pagination.pages,
    expectedPages,
  );
}
