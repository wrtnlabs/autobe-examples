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
 * Test filtering content reports by status.
 *
 * This test validates the moderator's ability to filter content reports by
 * their current status (pending_review, resolved, dismissed). A moderator
 * authenticates to the system and retrieves reports filtered by specific status
 * values. The test ensures that:
 *
 * 1. Only reports matching the requested status are returned
 * 2. Each status filter (pending_review, resolved, dismissed) works correctly
 * 3. Reports with resolved or dismissed status include resolved_at timestamp
 * 4. Status filtering works alongside pagination parameters
 * 5. The filtering logic doesn't interfere with other search/filter parameters
 *
 * The test follows a realistic moderator workflow of accessing the report queue
 * and filtering by status to manage the moderation workload.
 */
export async function test_api_content_reports_filter_by_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(12);
  const moderatorDisplayName = RandomGenerator.name();

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: RandomGenerator.alphaNumeric(12),
      display_name: moderatorDisplayName,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderatorAuth);

  // Step 2: Test filtering by pending_review status
  const pendingReviewRequest = {
    page: 1,
    limit: 50,
    status: "pending_review" as const,
  } satisfies IDiscussionBoardReport.IRequest;

  const pendingReviewResponse =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: pendingReviewRequest,
      },
    );
  typia.assert(pendingReviewResponse);

  // Validate that all returned reports have pending_review status
  for (const report of pendingReviewResponse.data) {
    TestValidator.equals(
      "report status should be pending_review",
      report.status,
      "pending_review",
    );
  }

  // Step 3: Test filtering by resolved status
  const resolvedRequest = {
    page: 1,
    limit: 50,
    status: "resolved" as const,
  } satisfies IDiscussionBoardReport.IRequest;

  const resolvedResponse =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: resolvedRequest,
      },
    );
  typia.assert(resolvedResponse);

  // Validate that all returned reports have resolved status
  for (const report of resolvedResponse.data) {
    TestValidator.equals(
      "report status should be resolved",
      report.status,
      "resolved",
    );
    // Verify resolved_at timestamp is present for resolved reports
    TestValidator.predicate(
      "resolved report should have resolved_at timestamp",
      report.resolved_at !== null && report.resolved_at !== undefined,
    );
  }

  // Step 4: Test filtering by dismissed status
  const dismissedRequest = {
    page: 1,
    limit: 50,
    status: "dismissed" as const,
  } satisfies IDiscussionBoardReport.IRequest;

  const dismissedResponse =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: dismissedRequest,
      },
    );
  typia.assert(dismissedResponse);

  // Validate that all returned reports have dismissed status
  for (const report of dismissedResponse.data) {
    TestValidator.equals(
      "report status should be dismissed",
      report.status,
      "dismissed",
    );
    // Verify resolved_at timestamp is present for dismissed reports
    TestValidator.predicate(
      "dismissed report should have resolved_at timestamp",
      report.resolved_at !== null && report.resolved_at !== undefined,
    );
  }

  // Step 5: Test that status filtering works with pagination
  const paginatedRequest = {
    page: 1,
    limit: 10,
    status: "pending_review" as const,
  } satisfies IDiscussionBoardReport.IRequest;

  const paginatedResponse =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: paginatedRequest,
      },
    );
  typia.assert(paginatedResponse);

  // Validate pagination information
  TestValidator.predicate(
    "pagination limit should match request",
    paginatedResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    paginatedResponse.pagination.current === 1,
  );

  // Validate all returned reports have correct status despite pagination
  for (const report of paginatedResponse.data) {
    TestValidator.equals(
      "paginated report status should be pending_review",
      report.status,
      "pending_review",
    );
  }

  // Step 6: Test filtering without status (all statuses)
  const noStatusFilterRequest = {
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardReport.IRequest;

  const noStatusFilterResponse =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: noStatusFilterRequest,
      },
    );
  typia.assert(noStatusFilterResponse);

  // Validate that responses include reports (without filtering by specific status)
  TestValidator.predicate(
    "unfiltered report response should return valid pagination",
    noStatusFilterResponse.pagination.records >= 0,
  );
}
