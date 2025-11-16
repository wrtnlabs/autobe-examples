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
 * Test sorting system settings results by setting_key in alphabetical order.
 *
 * Validates that the system settings API correctly sorts results alphabetically
 * by the setting_key field when requested. A moderator authenticates and
 * queries the settings endpoint with sort_by='setting_key' parameter, then
 * verifies that returned settings are properly ordered A-to-Z (ascending) and
 * Z-to-A (descending).
 *
 * Business context: System administrators need to browse configuration settings
 * in a organized manner. Alphabetical sorting by setting_key enables quick
 * discovery of specific settings in large configuration catalogs.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a moderator account
 * 2. Query system settings with sort_by='setting_key' and order='asc'
 * 3. Verify results are alphabetically sorted A-to-Z by setting_key
 * 4. Query system settings with sort_by='setting_key' and order='desc'
 * 5. Verify results are reverse alphabetically sorted Z-to-A by setting_key
 * 6. Validate pagination information is included in responses
 */
export async function test_api_system_settings_sort_by_key_alphabetical(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(authorized);

  // Step 2: Query system settings with ascending alphabetical sort
  const ascendingResult =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "setting_key",
          order: "asc",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 3: Verify ascending alphabetical order
  TestValidator.predicate(
    "ascending results should have data array",
    () => ascendingResult.data && ascendingResult.data.length > 0,
  );

  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const currentKey = ascendingResult.data[i].settingKey;
      const nextKey = ascendingResult.data[i + 1].settingKey;
      TestValidator.predicate(
        `setting_key at index ${i} should be less than or equal to index ${i + 1} in ascending order`,
        () => currentKey <= nextKey,
      );
    }
  }

  // Step 4: Query system settings with descending alphabetical sort
  const descendingResult =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "setting_key",
          order: "desc",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 5: Verify descending alphabetical order
  TestValidator.predicate(
    "descending results should have data array",
    () => descendingResult.data && descendingResult.data.length > 0,
  );

  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const currentKey = descendingResult.data[i].settingKey;
      const nextKey = descendingResult.data[i + 1].settingKey;
      TestValidator.predicate(
        `setting_key at index ${i} should be greater than or equal to index ${i + 1} in descending order`,
        () => currentKey >= nextKey,
      );
    }
  }

  // Step 6: Validate pagination information
  TestValidator.predicate(
    "ascending result pagination should exist",
    () =>
      ascendingResult.pagination !== undefined &&
      ascendingResult.pagination !== null,
  );

  TestValidator.equals(
    "ascending pagination current page should be 1",
    ascendingResult.pagination.current,
    1,
  );

  TestValidator.predicate(
    "descending result pagination should exist",
    () =>
      descendingResult.pagination !== undefined &&
      descendingResult.pagination !== null,
  );

  TestValidator.equals(
    "descending pagination current page should be 1",
    descendingResult.pagination.current,
    1,
  );
}
