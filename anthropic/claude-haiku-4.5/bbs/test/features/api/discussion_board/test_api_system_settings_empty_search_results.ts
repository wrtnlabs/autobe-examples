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
 * Tests empty search results for discussion board system settings.
 *
 * Validates that when moderators search or filter system settings with criteria
 * that match no records, the API returns an empty result set with correct
 * pagination metadata rather than throwing an error. This ensures the API
 * handles edge cases gracefully and provides clear feedback about empty
 * results.
 *
 * Steps:
 *
 * 1. Register a new moderator account for authentication
 * 2. Perform search with non-existent setting key/search term
 * 3. Verify response contains empty data array
 * 4. Verify pagination metadata shows 0 records and 0 pages
 * 5. Perform filtered search that yields no results
 * 6. Verify empty results with correct pagination for filter scenario
 */
export async function test_api_system_settings_empty_search_results(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorizedModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: moderatorData,
    },
  );
  typia.assert(authorizedModerator);

  // Step 2: Search with non-existent setting key
  const emptySearchResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          search: "nonexistent_setting_xyz_123",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(emptySearchResult);

  // Step 3: Verify response contains empty data array
  TestValidator.equals(
    "empty search results should have empty data array",
    emptySearchResult.data,
    [],
  );

  // Step 4: Verify pagination metadata shows 0 records and 0 pages
  TestValidator.equals(
    "empty search should have 0 records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should have 0 pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "current page should be valid",
    emptySearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be valid",
    emptySearchResult.pagination.limit > 0,
  );

  // Step 5: Perform filtered search that yields no results
  const emptyFilterResult: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          setting_key: "nonexistent_key_that_does_not_exist",
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(emptyFilterResult);

  // Step 6: Verify empty results with correct pagination for filter scenario
  TestValidator.equals(
    "filtered empty results should have empty data array",
    emptyFilterResult.data,
    [],
  );
  TestValidator.equals(
    "filtered search should have 0 records",
    emptyFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered search should have 0 pages",
    emptyFilterResult.pagination.pages,
    0,
  );
}
