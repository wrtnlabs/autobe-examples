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
 * Test moderator's ability to retrieve all pending content reports.
 *
 * This test validates the moderator's ability to access the content reports
 * moderation queue and retrieve all pending reports awaiting investigation. The
 * moderator authenticates via registration and then requests the reports list
 * with status filter for 'pending_review'. The test verifies that:
 *
 * 1. Moderator can successfully authenticate and join the system
 * 2. Content reports API returns a paginated list of pending reports
 * 3. Response includes pagination metadata (page, limit, total records, pages)
 * 4. Each report contains essential moderation context:
 *
 *    - Report ID and status (pending_review)
 *    - Report reason (category of violation)
 *    - Reporter member information
 *    - Creation timestamp
 * 5. Pagination works with default page 1 and standard limit
 * 6. Reports list is properly structured for moderator review workflow
 */
export async function test_api_content_reports_retrieve_all_pending(
  connection: api.IConnection,
) {
  // Step 1: Moderator authentication via join endpoint
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorDisplayName = RandomGenerator.name();

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: "SecurePassword123!",
      display_name: moderatorDisplayName,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderatorAuth);
  TestValidator.predicate(
    "moderator authentication should return valid token",
    moderatorAuth.token.access.length > 0,
  );

  // Step 2: Retrieve pending content reports with status filter
  const reportRequest = {
    page: 1,
    limit: 20,
    status: "pending_review" as const,
  } satisfies IDiscussionBoardReport.IRequest;

  const reportPage =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: reportRequest,
      },
    );
  typia.assert(reportPage);

  // Step 3: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    reportPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    reportPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records should be non-negative",
    reportPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages should match calculated pages",
    reportPage.pagination.pages ===
      Math.ceil(reportPage.pagination.records / reportPage.pagination.limit),
  );

  // Step 4: Validate report data structure and content
  if (reportPage.data.length > 0) {
    const report = reportPage.data[0];

    // Validate each report has required fields
    TestValidator.predicate(
      "report should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        report.id,
      ),
    );

    TestValidator.equals(
      "report status should be pending_review",
      report.status,
      "pending_review",
    );

    TestValidator.predicate(
      "report reason should be valid",
      [
        "offensive_language",
        "personal_attack",
        "spam",
        "off_topic",
        "copyright_violation",
        "harassment",
        "other",
      ].includes(report.reason),
    );

    TestValidator.predicate(
      "report created_at should be valid ISO datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(report.created_at),
    );

    // Validate reporter information
    TestValidator.predicate(
      "reporter should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        report.reporter.id,
      ),
    );

    TestValidator.predicate(
      "reporter display_name should be non-empty",
      report.reporter.display_name.length > 0,
    );

    TestValidator.predicate(
      "reporter account_status should be valid",
      ["active", "suspended", "terminated", "deleted"].includes(
        report.reporter.account_status,
      ),
    );
  }

  // Step 5: Validate that we can retrieve reports with default pagination
  const defaultPageRequest = {
    status: "pending_review" as const,
  } satisfies IDiscussionBoardReport.IRequest;

  const defaultPageResult =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: defaultPageRequest,
      },
    );
  typia.assert(defaultPageResult);

  TestValidator.predicate(
    "default request should return valid paginated result",
    defaultPageResult.pagination !== undefined &&
      defaultPageResult.data !== undefined,
  );

  // Step 6: Validate response structure consistency
  TestValidator.equals(
    "both requests should have consistent pagination structure",
    typeof reportPage.pagination,
    typeof defaultPageResult.pagination,
  );

  TestValidator.predicate(
    "data arrays should be arrays",
    Array.isArray(reportPage.data) && Array.isArray(defaultPageResult.data),
  );
}
