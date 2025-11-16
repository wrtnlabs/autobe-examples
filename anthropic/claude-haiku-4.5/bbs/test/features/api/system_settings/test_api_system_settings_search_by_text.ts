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
 * Test full-text search functionality across setting_key and description
 * fields.
 *
 * Validates that moderators can search system settings by text terms that match
 * both setting keys and descriptions. The test authenticates a moderator,
 * performs searches with various text terms, and validates that the API returns
 * results that contain the search term in either the setting key or
 * description.
 *
 * Steps:
 *
 * 1. Register a new moderator account
 * 2. Search system settings with a text term matching setting keys
 * 3. Validate search results contain the term in setting_key
 * 4. Search system settings with a text term matching descriptions
 * 5. Validate search results contain the term in description
 * 6. Verify pagination and result metadata are correct
 */
export async function test_api_system_settings_search_by_text(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAccount = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderatorAccount);
  TestValidator.predicate(
    "moderator account created successfully",
    moderatorAccount.id !== undefined && moderatorAccount.token !== undefined,
  );

  // Step 2: Search system settings with text term "max"
  const searchTermMax = "max";
  const searchResultsMax =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          search: searchTermMax,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(searchResultsMax);

  // Step 3: Validate search results contain the term in setting_key or description
  TestValidator.predicate(
    "search results contain matching settings",
    searchResultsMax.data.length > 0 ||
      searchResultsMax.pagination.records === 0,
  );

  for (const setting of searchResultsMax.data) {
    const matchesKey = setting.settingKey
      .toLowerCase()
      .includes(searchTermMax.toLowerCase());
    const matchesDescription = setting.description
      ? setting.description.toLowerCase().includes(searchTermMax.toLowerCase())
      : false;
    TestValidator.predicate(
      `setting matches search term in key or description: ${setting.settingKey}`,
      matchesKey || matchesDescription,
    );
  }

  // Step 4: Validate pagination information
  TestValidator.predicate(
    "pagination current page is valid",
    searchResultsMax.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    searchResultsMax.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    searchResultsMax.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    searchResultsMax.pagination.pages >= 0,
  );

  // Step 5: Search with different text term to validate search works broadly
  const searchTermSettings = "setting";
  const searchResultsSettings =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          search: searchTermSettings,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(searchResultsSettings);

  // Step 6: Validate all search results match the search term
  for (const setting of searchResultsSettings.data) {
    const matchesKey = setting.settingKey
      .toLowerCase()
      .includes(searchTermSettings.toLowerCase());
    const matchesDescription = setting.description
      ? setting.description
          .toLowerCase()
          .includes(searchTermSettings.toLowerCase())
      : false;
    TestValidator.predicate(
      `each result matches search term in key or description`,
      matchesKey || matchesDescription,
    );
  }

  // Step 7: Verify response type structure
  TestValidator.predicate(
    "response has pagination object",
    searchResultsMax.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(searchResultsMax.data),
  );
}
