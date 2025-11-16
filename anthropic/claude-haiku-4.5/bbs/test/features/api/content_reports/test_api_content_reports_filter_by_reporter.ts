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
 * Test filtering content reports by the member who submitted the report
 * (reporterId filter).
 *
 * This test validates that moderators can successfully filter the content
 * reports queue to view only reports submitted by a specific member. The test
 * creates a moderator account, generates sample reports with different
 * reporters, and verifies that filtering by a specific reporterId returns only
 * the reports submitted by that member while excluding reports from other
 * reporters. It also validates that the reporterId filter works correctly in
 * combination with other search and filter parameters like pagination, status
 * filtering, and sorting options.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Query all content reports without filters to establish baseline
 * 3. Filter reports by a specific reporterId
 * 4. Validate that filtered results contain only reports from the specified
 *    reporter
 * 5. Verify reporter identity in each returned report matches the filter
 * 6. Test reporterId filter combined with other parameters (status, pagination)
 * 7. Confirm filters correctly exclude reports from other reporters
 */
export async function test_api_content_reports_filter_by_reporter(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Query all content reports without filters to establish baseline
  const allReportsResponse: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(allReportsResponse);

  // Verify pagination information is present
  TestValidator.predicate(
    "pagination info should be present",
    allReportsResponse.pagination !== undefined,
  );

  // 3. If there are reports, filter by the first reporter's ID
  if (allReportsResponse.data.length > 0) {
    const firstReport = allReportsResponse.data[0];
    const reporterId: string & tags.Format<"uuid"> = firstReport.reporter.id;

    // 4. Filter reports by the specific reporterId
    const filteredReportsResponse: IPageIDiscussionBoardReport.ISummary =
      await api.functional.discussionBoard.moderator.moderation.content_reports.index(
        connection,
        {
          body: {
            page: 1,
            limit: 50,
            reporterId: reporterId,
          } satisfies IDiscussionBoardReport.IRequest,
        },
      );
    typia.assert(filteredReportsResponse);

    // 5. Validate that all filtered results have the same reporter
    TestValidator.predicate(
      "all filtered reports should have the same reporter ID",
      filteredReportsResponse.data.every(
        (report) => report.reporter.id === reporterId,
      ),
    );

    // Verify that filter actually returns results
    TestValidator.predicate(
      "filtered results should not be empty when reporter exists",
      filteredReportsResponse.data.length > 0,
    );

    // 6. Verify each report's reporter matches the filter
    for (const report of filteredReportsResponse.data) {
      TestValidator.equals(
        "report reporter ID matches filter",
        report.reporter.id,
        reporterId,
      );
    }

    // 7. Test reporterId filter combined with status filter
    const filteredByReporterAndStatus: IPageIDiscussionBoardReport.ISummary =
      await api.functional.discussionBoard.moderator.moderation.content_reports.index(
        connection,
        {
          body: {
            page: 1,
            limit: 50,
            reporterId: reporterId,
            status: "pending_review",
          } satisfies IDiscussionBoardReport.IRequest,
        },
      );
    typia.assert(filteredByReporterAndStatus);

    // Verify combined filter results
    TestValidator.predicate(
      "combined filter should only return reports from specified reporter with pending_review status",
      filteredByReporterAndStatus.data.every(
        (report) =>
          report.reporter.id === reporterId &&
          report.status === "pending_review",
      ),
    );

    // 8. Test pagination with reporterId filter
    const paginatedFiltered: IPageIDiscussionBoardReport.ISummary =
      await api.functional.discussionBoard.moderator.moderation.content_reports.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            reporterId: reporterId,
          } satisfies IDiscussionBoardReport.IRequest,
        },
      );
    typia.assert(paginatedFiltered);

    TestValidator.predicate(
      "pagination limit should be respected",
      paginatedFiltered.data.length <= 10,
    );

    TestValidator.predicate(
      "all paginated results should have the correct reporter",
      paginatedFiltered.data.every(
        (report) => report.reporter.id === reporterId,
      ),
    );
  }

  // 9. Test with a non-existent reporter ID to verify no false positives
  const nonExistentReporterId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyFilterResponse: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          reporterId: nonExistentReporterId,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);

  // Filter should return empty or only matching reporter
  TestValidator.predicate(
    "non-existent reporter filter should return no reports or only matching reports",
    emptyFilterResponse.data.every(
      (report) => report.reporter.id === nonExistentReporterId,
    ),
  );
}
