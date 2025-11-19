import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountAction";

/**
 * Test search behavior when no actions match the filter criteria.
 *
 * This test validates that the account actions search endpoint properly handles
 * scenarios where filter criteria match no existing records. It ensures the API
 * returns a well-structured empty result with correct pagination metadata
 * rather than throwing an error.
 *
 * Test Flow:
 *
 * 1. Authenticate as moderator to access the search endpoint
 * 2. Search with filters that match no records (non-existent member_id)
 * 3. Validate empty data array is returned
 * 4. Verify pagination metadata shows 0 records and 0 pages
 * 5. Confirm the operation succeeds without errors
 */
export async function test_api_account_action_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Search with filters that match no existing records
  // Using a random UUID for member_id that doesn't exist in the system
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  const searchResult: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          member_id: nonExistentMemberId,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(searchResult);

  // Step 3: Validate empty data array
  TestValidator.equals(
    "data array should be empty when no records match",
    searchResult.data,
    [],
  );

  // Step 4: Verify pagination metadata shows zero records
  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "total records should be 0",
    searchResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "total pages should be 0",
    searchResult.pagination.pages,
    0,
  );

  TestValidator.equals(
    "limit should match request",
    searchResult.pagination.limit,
    20,
  );

  // Step 5: Additional validation with date range filters that match nothing
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const evenMoreFutureDate = new Date(
    Date.now() + 730 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const dateRangeResult: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          created_after: futureDate,
          created_before: evenMoreFutureDate,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(dateRangeResult);

  TestValidator.equals(
    "data array should be empty for future date range",
    dateRangeResult.data,
    [],
  );

  TestValidator.equals(
    "records should be 0 for future date range",
    dateRangeResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "pages should be 0 for future date range",
    dateRangeResult.pagination.pages,
    0,
  );
}
