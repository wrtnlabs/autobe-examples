import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

/**
 * Test basic pagination functionality for moderation actions listing.
 *
 * This test verifies that moderators can efficiently navigate through
 * moderation action audit trails using pagination. It validates that:
 *
 * 1. Moderator authentication works correctly
 * 2. Pagination with page=1 and limit=10 returns correct data
 * 3. Page metadata (current, limit, records, pages) is accurate
 * 4. Multiple pages can be retrieved without data duplication
 * 5. Page boundaries are respected across navigation
 *
 * The test flows through these steps:
 *
 * 1. Register a moderator account
 * 2. Request first page (page 1, limit 10)
 * 3. Validate pagination metadata
 * 4. Request second page to verify no data duplication
 * 5. Validate that pagination limits are enforced
 */
export async function test_api_moderation_actions_pagination_basic(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(12),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request first page of moderation actions (page=1, limit=10)
  const firstPage: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(firstPage);

  // Step 3: Validate pagination metadata for first page
  TestValidator.equals(
    "first page current number is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit is 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page has valid records count",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page has valid pages count",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data array length does not exceed limit",
    firstPage.data.length <= 10,
  );

  // Step 4: Validate that records count matches data array length on first page
  if (firstPage.pagination.records > 0) {
    if (firstPage.pagination.current === firstPage.pagination.pages) {
      // Last page - may have fewer records
      TestValidator.predicate(
        "last page data length matches remaining records",
        firstPage.data.length ===
          (firstPage.pagination.records % firstPage.pagination.limit === 0
            ? firstPage.pagination.limit
            : firstPage.pagination.records % firstPage.pagination.limit),
      );
    } else {
      // Not last page - should have exactly limit records
      TestValidator.equals(
        "non-last page has exactly limit records",
        firstPage.data.length,
        10,
      );
    }
  }

  // Step 5: Request second page to verify pagination progression
  if (firstPage.pagination.pages > 1) {
    const secondPage: IPageIDiscussionBoardModerationAction.ISummary =
      await api.functional.discussionBoard.moderator.moderation.actions.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardModerationAction.IRequest,
        },
      );
    typia.assert(secondPage);

    // Step 6: Validate second page metadata
    TestValidator.equals(
      "second page current number is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit is 10",
      secondPage.pagination.limit,
      10,
    );

    // Step 7: Verify no data duplication between pages
    const firstPageIds = new Set(firstPage.data.map((action) => action.id));
    const secondPageIds = new Set(secondPage.data.map((action) => action.id));
    const intersection = Array.from(firstPageIds).filter((id) =>
      secondPageIds.has(id),
    );
    TestValidator.predicate(
      "no data duplication between first and second page",
      intersection.length === 0,
    );

    // Step 8: Validate that second page records count is consistent
    TestValidator.equals(
      "second page has same total records as first page",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "second page has same pages count as first page",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
  }

  // Step 9: Test edge case - request with limit=1 to test minimum pagination
  const limitOnePage: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(limitOnePage);

  TestValidator.equals(
    "limit one page has correct limit",
    limitOnePage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "limit one page data has at most 1 item",
    limitOnePage.data.length <= 1,
  );

  // Step 10: Verify pagination calculations are consistent
  TestValidator.predicate(
    "pages calculation is correct",
    limitOnePage.pagination.pages ===
      Math.ceil(
        limitOnePage.pagination.records / limitOnePage.pagination.limit,
      ),
  );
}
