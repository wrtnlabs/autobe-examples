import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Test moderator's ability to handle search queries that return no results,
 * ensuring the queue displays correctly when no reports match the search
 * criteria.
 *
 * This test validates that when a moderator performs searches with filters that
 * don't match any reports in the system, the API correctly returns empty
 * results with proper pagination metadata. The test verifies:
 *
 * 1. Moderator account creation and authentication
 * 2. Searching for reports with nonexistent reason filters
 * 3. Searching reports within date ranges that contain no reports
 * 4. Proper pagination response structure with zero records
 * 5. Empty data array in the response
 *
 * This ensures that moderators receive clear feedback about empty search
 * results and can properly handle the queue display when no reports match
 * criteria.
 */
export async function test_api_moderator_reports_queue_empty_results(
  connection: api.IConnection,
) {
  // 1. Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authorizedModerator);

  // 2. Search with nonexistent reason filter - should return empty results
  const emptyResultsNonexistentReason: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        reason: "offensive_language",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(emptyResultsNonexistentReason);

  TestValidator.equals(
    "empty results pagination current page",
    emptyResultsNonexistentReason.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty results pagination records count",
    emptyResultsNonexistentReason.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pagination pages count",
    emptyResultsNonexistentReason.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results pagination limit",
    emptyResultsNonexistentReason.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "empty results data array is empty",
    emptyResultsNonexistentReason.data.length === 0,
  );

  // 3. Search with date range that contains no reports
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const distantFutureDate = new Date(futureDate);
  distantFutureDate.setFullYear(distantFutureDate.getFullYear() + 1);

  const emptyResultsFutureDateRange: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        dateFrom: futureDate.toISOString(),
        dateTo: distantFutureDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(emptyResultsFutureDateRange);

  TestValidator.equals(
    "empty results with future date range records",
    emptyResultsFutureDateRange.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results with future date range pages",
    emptyResultsFutureDateRange.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty results with future date range data is empty",
    emptyResultsFutureDateRange.data.length === 0,
  );

  // 4. Search with text search that doesn't match any reports
  const emptyResultsTextSearch: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        search: "nonexistent_search_term_xyz_abc_12345",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(emptyResultsTextSearch);

  TestValidator.equals(
    "empty results text search records",
    emptyResultsTextSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results text search pages",
    emptyResultsTextSearch.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty results text search data is empty",
    emptyResultsTextSearch.data.length === 0,
  );

  // 5. Search with unassigned reports filter (no assigned moderator)
  const emptyResultsUnassignedFilter: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: {
        assignedModeratorId: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardReport.IRequest,
    });
  typia.assert(emptyResultsUnassignedFilter);

  TestValidator.equals(
    "empty results nonexistent moderator assignment records",
    emptyResultsUnassignedFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results nonexistent moderator assignment pages",
    emptyResultsUnassignedFilter.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty results nonexistent moderator assignment data is empty",
    emptyResultsUnassignedFilter.data.length === 0,
  );
}
