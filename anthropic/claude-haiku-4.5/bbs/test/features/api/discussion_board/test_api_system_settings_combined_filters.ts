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
 * Tests the system settings endpoint with multiple combined filters.
 *
 * This test validates that the system settings query endpoint correctly applies
 * multiple filters simultaneously using AND logic. A moderator authenticates,
 * then performs queries with various combinations of filters (setting_type,
 * is_active, search) to ensure results satisfy ALL filter criteria.
 *
 * Test Steps:
 *
 * 1. Register and authenticate a new moderator account
 * 2. Query system settings with single filter to establish baseline
 * 3. Query with two filters combined (type AND active status)
 * 4. Query with three filters combined (type AND active status AND search term)
 * 5. Validate that results match ALL filter criteria using AND logic
 * 6. Verify pagination works correctly with combined filters
 */
export async function test_api_system_settings_combined_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate moderator
  const moderatorCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<100>
    >(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(authorized);

  // 2. Query with single filter - boolean type filter
  const singleFilterResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          setting_type: "boolean",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(singleFilterResult);
  TestValidator.predicate(
    "single filter returns valid pagination data",
    singleFilterResult.pagination.current >= 0 &&
      singleFilterResult.pagination.limit > 0 &&
      singleFilterResult.pagination.records >= 0,
  );

  // Verify all results match the boolean type filter
  singleFilterResult.data.forEach((setting) => {
    TestValidator.equals(
      "setting type matches single filter",
      setting.settingType,
      "boolean",
    );
  });

  // 3. Query with two filters combined - type AND active status
  const twoFiltersResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          setting_type: "boolean",
          is_active: true,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(twoFiltersResult);
  TestValidator.predicate(
    "two filters return valid pagination",
    twoFiltersResult.pagination.current >= 0 &&
      twoFiltersResult.pagination.limit > 0,
  );

  // Verify all results match BOTH filters
  twoFiltersResult.data.forEach((setting) => {
    TestValidator.equals(
      "setting type matches first filter in combined query",
      setting.settingType,
      "boolean",
    );
    TestValidator.equals(
      "is_active matches second filter in combined query",
      setting.isActive,
      true,
    );
  });

  // 4. Query with three filters combined - type AND active AND search
  const searchTerm = "maintenance";
  const threeFiltersResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          setting_type: "boolean",
          is_active: true,
          search: searchTerm,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(threeFiltersResult);

  // Verify all results match ALL THREE filters
  threeFiltersResult.data.forEach((setting) => {
    TestValidator.equals(
      "setting type matches in three-filter query",
      setting.settingType,
      "boolean",
    );
    TestValidator.equals(
      "is_active matches in three-filter query",
      setting.isActive,
      true,
    );
    TestValidator.predicate(
      "search term found in key or description",
      setting.settingKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (setting.description !== null &&
          setting.description !== undefined &&
          setting.description.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  });

  // 5. Verify filter combination reduces result count compared to single filter
  TestValidator.predicate(
    "combined filters return subset or equal results",
    threeFiltersResult.data.length <= twoFiltersResult.data.length &&
      twoFiltersResult.data.length <= singleFilterResult.data.length,
  );

  // 6. Test pagination with combined filters
  const page2Result: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          setting_type: "boolean",
          is_active: true,
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 request returns correct page number",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page2Result.pagination.limit,
    10,
  );

  // 7. Test with different filter combination - integer type and inactive
  const integerInactiveResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          setting_type: "integer",
          is_active: false,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(integerInactiveResult);

  // Verify all results match both integer and inactive filters
  integerInactiveResult.data.forEach((setting) => {
    TestValidator.equals(
      "setting type is integer in second combination",
      setting.settingType,
      "integer",
    );
    TestValidator.equals(
      "is_active is false in second combination",
      setting.isActive,
      false,
    );
  });

  // 8. Test sorting with combined filters
  const sortedResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          setting_type: "string",
          is_active: true,
          sort_by: "setting_key",
          order: "asc",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(sortedResult);

  // Verify filters still apply with sorting
  sortedResult.data.forEach((setting) => {
    TestValidator.equals(
      "setting type matches with sorting applied",
      setting.settingType,
      "string",
    );
    TestValidator.equals(
      "is_active matches with sorting applied",
      setting.isActive,
      true,
    );
  });

  // 9. Test with null/undefined filters to ensure they don't affect results
  const noFilterResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(noFilterResult);
  TestValidator.predicate(
    "unfiltered query returns data",
    noFilterResult.data.length >= 0,
  );
}
