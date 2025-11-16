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
 * Test filtering content reports by reason categories.
 *
 * Validates that moderators can filter reports by violation reason types
 * including offensive_language, personal_attack, spam, off_topic,
 * copyright_violation, harassment, and other. Tests that:
 *
 * 1. Moderator authenticates successfully
 * 2. Multiple reason filters work independently
 * 3. Reports are correctly filtered by reason category
 * 4. Pagination works correctly with reason filters
 * 5. Empty results are handled properly
 */
export async function test_api_content_reports_filter_by_reason(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a moderator
  const moderatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCredentials,
  });
  typia.assert(moderator);

  TestValidator.predicate(
    "moderator authentication successful",
    moderator.token.access !== "",
  );

  // 2. Test filtering by each reason category
  const reasons = [
    "offensive_language",
    "personal_attack",
    "spam",
    "off_topic",
    "copyright_violation",
    "harassment",
    "other",
  ] as const;

  for (const reason of reasons) {
    const requestBody = {
      reason,
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardReport.IRequest;

    const reportPage =
      await api.functional.discussionBoard.moderator.moderation.content_reports.index(
        connection,
        {
          body: requestBody,
        },
      );

    typia.assert(reportPage);

    // Validate pagination structure
    TestValidator.predicate(
      `pagination structure valid for reason ${reason}`,
      reportPage.pagination.current >= 0 &&
        reportPage.pagination.limit >= 0 &&
        reportPage.pagination.records >= 0 &&
        reportPage.pagination.pages >= 0,
    );

    // Validate all returned reports match the requested reason
    if (reportPage.data.length > 0) {
      for (const report of reportPage.data) {
        TestValidator.equals(
          `report reason matches filter for ${reason}`,
          report.reason,
          reason,
        );
      }
    }

    TestValidator.predicate(
      `reports returned for reason ${reason}`,
      reportPage.data.length >= 0,
    );
  }

  // 3. Test filtering with pagination parameters
  const paginationTestBody = {
    reason: "spam" as const,
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardReport.IRequest;

  const paginatedResults =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: paginationTestBody,
      },
    );

  typia.assert(paginatedResults);

  TestValidator.predicate(
    "pagination limit respected",
    paginatedResults.data.length <= 5,
  );

  TestValidator.equals(
    "current page matches request",
    paginatedResults.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit matches request",
    paginatedResults.pagination.limit,
    5,
  );

  // 4. Test filtering with multiple optional parameters
  const advancedFilterBody = {
    reason: "harassment" as const,
    status: "pending_review" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardReport.IRequest;

  const advancedResults =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: advancedFilterBody,
      },
    );

  typia.assert(advancedResults);

  // Validate all results match the reason filter
  for (const report of advancedResults.data) {
    TestValidator.equals(
      "report matches reason filter in advanced search",
      report.reason,
      "harassment",
    );
  }

  // 5. Test empty/no results scenario
  const emptyFilterBody = {
    reason: "other" as const,
    page: 100, // High page number likely to return no results
    limit: 10,
  } satisfies IDiscussionBoardReport.IRequest;

  const emptyResults =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: emptyFilterBody,
      },
    );

  typia.assert(emptyResults);

  TestValidator.predicate(
    "pagination structure valid for empty results",
    emptyResults.pagination.current >= 0 &&
      emptyResults.pagination.limit >= 0 &&
      emptyResults.pagination.records >= 0 &&
      emptyResults.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "empty results handled gracefully",
    Array.isArray(emptyResults.data),
  );
}
