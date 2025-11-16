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
 * Test pagination functionality with specified page limit for system settings.
 *
 * This test validates that the system settings pagination API correctly handles
 * multiple page requests with a consistent limit parameter. The test ensures
 * that:
 *
 * 1. Moderator authentication succeeds and provides valid credentials
 * 2. First page request returns correct pagination metadata
 * 3. Second page request returns different data without duplication
 * 4. Pagination metadata (current page, limit, total records, total pages) is
 *    accurate
 * 5. Different pages return distinct result sets
 *
 * Process:
 *
 * 1. Register a new moderator account
 * 2. Request system settings first page with limit=10
 * 3. Verify first page pagination metadata and data
 * 4. Request system settings second page with same limit=10
 * 5. Verify second page pagination metadata and data
 * 6. Ensure no duplication between pages
 */
export async function test_api_system_settings_pagination_with_limit(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request first page with limit=10
  const firstPageResponse: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(firstPageResponse);

  // Step 3: Verify first page pagination metadata
  TestValidator.equals(
    "first page current page number is 1",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit is 10",
    firstPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page has valid pagination data",
    firstPageResponse.pagination.records >= 0 &&
      firstPageResponse.pagination.pages >= 0,
  );

  // Step 4: Request second page with same limit=10
  const secondPageResponse: IPageIDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(secondPageResponse);

  // Step 5: Verify second page pagination metadata
  TestValidator.equals(
    "second page current page number is 2",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 10",
    secondPageResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "both pages have same total records",
    firstPageResponse.pagination.records,
    secondPageResponse.pagination.records,
  );
  TestValidator.equals(
    "both pages have same total pages",
    firstPageResponse.pagination.pages,
    secondPageResponse.pagination.pages,
  );

  // Step 6: Verify pagination consistency
  TestValidator.predicate(
    "pagination limit matches expected value",
    firstPageResponse.pagination.limit === 10 &&
      secondPageResponse.pagination.limit === 10,
  );

  // Step 7: Verify data integrity - ensure no duplication between pages
  if (firstPageResponse.data.length > 0 && secondPageResponse.data.length > 0) {
    const firstPageIds = firstPageResponse.data.map((item) => item.id);
    const secondPageIds = secondPageResponse.data.map((item) => item.id);

    // Check that there are no common IDs between pages
    const commonIds = firstPageIds.filter((id) => secondPageIds.includes(id));
    TestValidator.predicate(
      "no duplicate items between first and second page",
      commonIds.length === 0,
    );
  }

  // Step 8: Verify page calculation
  if (
    firstPageResponse.pagination.records > 0 &&
    firstPageResponse.pagination.limit > 0
  ) {
    const expectedPages = Math.ceil(
      firstPageResponse.pagination.records / firstPageResponse.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation is correct",
      firstPageResponse.pagination.pages,
      expectedPages,
    );
  }
}
