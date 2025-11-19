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
 * Test content reports filtering API with date range parameters.
 *
 * This test validates that the content reports filtering endpoint accepts and
 * processes date range parameters (created_at_from, created_at_to,
 * resolved_at_from, resolved_at_to) correctly. Since no report creation API is
 * available, this test focuses on API structure validation and parameter
 * handling rather than business logic validation.
 *
 * The test verifies:
 *
 * - Moderator can access the content reports filtering endpoint
 * - Date range parameters are accepted in ISO 8601 format
 * - The API returns properly structured paginated responses
 * - Different date range combinations are processed without errors
 */
export async function test_api_content_reports_filtering_by_date_range(
  connection: api.IConnection,
) {
  // Create moderator account for accessing content reports
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Test 1: Filter with created_at date range
  const now = new Date();
  const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const createdAtFilterResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          created_at_from: pastWeek.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(createdAtFilterResult);
  TestValidator.predicate(
    "created_at filter returns paginated response",
    typeof createdAtFilterResult.pagination.current === "number",
  );

  // Test 2: Filter with resolved_at date range
  const resolvedAtFilterResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          resolved_at_from: pastWeek.toISOString(),
          resolved_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(resolvedAtFilterResult);
  TestValidator.predicate(
    "resolved_at filter returns paginated response",
    typeof resolvedAtFilterResult.pagination.pages === "number",
  );

  // Test 3: Combined date range filters
  const combinedFilterResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          created_at_from: pastWeek.toISOString(),
          created_at_to: now.toISOString(),
          resolved_at_from: pastWeek.toISOString(),
          resolved_at_to: now.toISOString(),
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined date filters return valid response",
    Array.isArray(combinedFilterResult.data),
  );

  // Test 4: Filter with future date range (should return empty results)
  const futureDateEnd = new Date(futureDate.getTime() + 24 * 60 * 60 * 1000);
  const futureRangeResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          created_at_from: futureDate.toISOString(),
          created_at_to: futureDateEnd.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(futureRangeResult);
  TestValidator.equals(
    "future date range returns empty results",
    futureRangeResult.data.length,
    0,
  );

  // Test 5: Filter with status and date range combination
  const statusWithDateResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          status: "pending",
          created_at_from: pastWeek.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(statusWithDateResult);
  TestValidator.predicate(
    "status filter combined with date range works",
    typeof statusWithDateResult.pagination.records === "number",
  );
}
