import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test filtering content reports by resolution status to enable efficient
 * moderation queue management.
 *
 * This test validates that moderators can filter reports by status values:
 * pending, reviewed_no_action, reviewed_edited, and reviewed_removed. The test
 * queries the reports endpoint with different status filters to verify accurate
 * filtering and validates that pagination works correctly with status
 * filtering.
 *
 * Steps:
 *
 * 1. Create and authenticate as moderator
 * 2. Query reports with status filter for "pending" (most common moderation
 *    workflow)
 * 3. Query reports with status filter for "reviewed_no_action"
 * 4. Query reports with status filter for "reviewed_edited"
 * 5. Query reports with status filter for "reviewed_removed"
 * 6. Validate pagination metadata reflects filtered result sets accurately
 * 7. Verify that returned reports match the requested status exactly
 */
export async function test_api_content_reports_filtering_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Query reports filtered by "pending" status (most common workflow - unresolved reports)
  const pendingReportsPage =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "pending",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(pendingReportsPage);

  // Validate pagination structure
  TestValidator.predicate(
    "pending reports pagination has valid current page",
    pendingReportsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pending reports pagination has valid limit",
    pendingReportsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pending reports pagination has valid records count",
    pendingReportsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending reports pagination has valid pages count",
    pendingReportsPage.pagination.pages >= 0,
  );

  // Validate all returned reports have "pending" status
  for (const report of pendingReportsPage.data) {
    TestValidator.equals(
      "pending filtered report has pending status",
      report.status,
      "pending",
    );
  }

  // Step 3: Query reports filtered by "reviewed_no_action" status
  const noActionReportsPage =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "reviewed_no_action",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(noActionReportsPage);

  // Validate all returned reports have "reviewed_no_action" status
  for (const report of noActionReportsPage.data) {
    TestValidator.equals(
      "no action filtered report has reviewed_no_action status",
      report.status,
      "reviewed_no_action",
    );
    // Resolved reports should have resolution details
    TestValidator.predicate(
      "reviewed report has resolved_by_moderator_id",
      report.resolved_by_moderator_id !== null &&
        report.resolved_by_moderator_id !== undefined,
    );
    TestValidator.predicate(
      "reviewed report has resolved_at timestamp",
      report.resolved_at !== null && report.resolved_at !== undefined,
    );
  }

  // Step 4: Query reports filtered by "reviewed_edited" status
  const editedReportsPage =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "reviewed_edited",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(editedReportsPage);

  // Validate all returned reports have "reviewed_edited" status
  for (const report of editedReportsPage.data) {
    TestValidator.equals(
      "edited filtered report has reviewed_edited status",
      report.status,
      "reviewed_edited",
    );
    // Resolved reports should have resolution details
    TestValidator.predicate(
      "edited report has resolved_by_moderator_id",
      report.resolved_by_moderator_id !== null &&
        report.resolved_by_moderator_id !== undefined,
    );
    TestValidator.predicate(
      "edited report has resolved_at timestamp",
      report.resolved_at !== null && report.resolved_at !== undefined,
    );
  }

  // Step 5: Query reports filtered by "reviewed_removed" status
  const removedReportsPage =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "reviewed_removed",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(removedReportsPage);

  // Validate all returned reports have "reviewed_removed" status
  for (const report of removedReportsPage.data) {
    TestValidator.equals(
      "removed filtered report has reviewed_removed status",
      report.status,
      "reviewed_removed",
    );
    // Resolved reports should have resolution details
    TestValidator.predicate(
      "removed report has resolved_by_moderator_id",
      report.resolved_by_moderator_id !== null &&
        report.resolved_by_moderator_id !== undefined,
    );
    TestValidator.predicate(
      "removed report has resolved_at timestamp",
      report.resolved_at !== null && report.resolved_at !== undefined,
    );
  }

  // Step 6: Test pagination with status filtering
  const paginatedPendingPage1 =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          status: "pending",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(paginatedPendingPage1);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page matches request",
    paginatedPendingPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedPendingPage1.pagination.limit,
    5,
  );

  // If there are more records than the limit, test page 2
  if (paginatedPendingPage1.pagination.records > 5) {
    const paginatedPendingPage2 =
      await api.functional.discussionBoard.moderator.contentReports.index(
        connection,
        {
          body: {
            page: 2,
            limit: 5,
            status: "pending",
          } satisfies IDiscussionBoardContentReport.IRequest,
        },
      );
    typia.assert(paginatedPendingPage2);

    TestValidator.equals(
      "page 2 current page matches request",
      paginatedPendingPage2.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 total records matches page 1",
      paginatedPendingPage2.pagination.records,
      paginatedPendingPage1.pagination.records,
    );

    // Validate all reports on page 2 also have pending status
    for (const report of paginatedPendingPage2.data) {
      TestValidator.equals(
        "page 2 pending filtered report has pending status",
        report.status,
        "pending",
      );
    }
  }
}
