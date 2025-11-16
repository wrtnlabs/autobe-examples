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
 * Test sorting content reports by creation date in ascending and descending
 * order.
 *
 * This test validates that the moderator content reports API correctly sorts
 * reports by their creation date (createdAt field). It tests both ascending
 * order (oldest first) and descending order (newest first) to ensure the
 * sorting functionality works as expected.
 *
 * Test workflow:
 *
 * 1. Authenticate as a moderator
 * 2. Request reports sorted by createdAt in ascending order
 * 3. Validate that reports are ordered from oldest to newest
 * 4. Request reports sorted by createdAt in descending order
 * 5. Validate that reports are ordered from newest to oldest
 * 6. Test sorting with pagination to ensure it works across multiple pages
 * 7. Verify that sorting doesn't modify report data, only the order
 */
export async function test_api_content_reports_sorting_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
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
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<100>
        >(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request reports sorted by createdAt in ascending order (oldest first)
  const ascendingResult: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "createdAt",
          order: "asc",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 3: Validate ascending order - each report should be >= previous report's creation date
  TestValidator.predicate(
    "ascending order has at least one report",
    ascendingResult.data.length > 0,
  );

  for (let i = 1; i < ascendingResult.data.length; i++) {
    const previousDate = new Date(ascendingResult.data[i - 1].created_at);
    const currentDate = new Date(ascendingResult.data[i].created_at);
    TestValidator.predicate(
      `report at index ${i} is not earlier than report at index ${i - 1} in ascending order`,
      currentDate.getTime() >= previousDate.getTime(),
    );
  }

  // Step 4: Request reports sorted by createdAt in descending order (newest first)
  const descendingResult: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "createdAt",
          order: "desc",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 5: Validate descending order - each report should be <= previous report's creation date
  TestValidator.predicate(
    "descending order has at least one report",
    descendingResult.data.length > 0,
  );

  for (let i = 1; i < descendingResult.data.length; i++) {
    const previousDate = new Date(descendingResult.data[i - 1].created_at);
    const currentDate = new Date(descendingResult.data[i].created_at);
    TestValidator.predicate(
      `report at index ${i} is not later than report at index ${i - 1} in descending order`,
      currentDate.getTime() <= previousDate.getTime(),
    );
  }

  // Step 6: Test sorting with pagination
  const pageOneAscending: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          orderBy: "createdAt",
          order: "asc",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(pageOneAscending);

  const pageTwoAscending: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          orderBy: "createdAt",
          order: "asc",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(pageTwoAscending);

  // Step 7: Validate pagination maintains sort order across pages
  if (pageOneAscending.data.length > 0 && pageTwoAscending.data.length > 0) {
    const lastFromPageOne = new Date(
      pageOneAscending.data[pageOneAscending.data.length - 1].created_at,
    );
    const firstFromPageTwo = new Date(pageTwoAscending.data[0].created_at);
    TestValidator.predicate(
      "pagination maintains ascending sort order across pages",
      firstFromPageTwo.getTime() >= lastFromPageOne.getTime(),
    );
  }

  // Step 8: Verify sorting doesn't modify report data
  TestValidator.equals(
    "ascending and descending results contain same report count",
    ascendingResult.data.length,
    descendingResult.data.length,
  );

  // Verify data integrity by checking that same report IDs exist in both sorts
  const ascendingIds = new Set(ascendingResult.data.map((r) => r.id));
  const descendingIds = new Set(descendingResult.data.map((r) => r.id));

  TestValidator.predicate(
    "same reports present in ascending and descending results",
    Array.from(ascendingIds).every((id) => descendingIds.has(id)) &&
      Array.from(descendingIds).every((id) => ascendingIds.has(id)),
  );

  // Step 9: Test sorting with filters to ensure sort works with other criteria
  const sortedWithFilter: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "createdAt",
          order: "asc",
          status: "pending_review",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(sortedWithFilter);

  // Validate filtered results are also properly sorted
  if (sortedWithFilter.data.length > 1) {
    for (let i = 1; i < sortedWithFilter.data.length; i++) {
      const previousDate = new Date(sortedWithFilter.data[i - 1].created_at);
      const currentDate = new Date(sortedWithFilter.data[i].created_at);
      TestValidator.predicate(
        `filtered report at index ${i} maintains sort order`,
        currentDate.getTime() >= previousDate.getTime(),
      );
    }
  }
}
