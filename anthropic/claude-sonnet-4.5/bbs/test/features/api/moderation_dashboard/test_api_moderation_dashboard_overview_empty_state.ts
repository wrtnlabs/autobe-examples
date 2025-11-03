import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerationDashboardOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationDashboardOverview";
import type { IDiscussionBoardModerationDashboardStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationDashboardStatistics";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test that the moderation dashboard overview displays correctly when there are
 * no pending reports, moderation actions, or suspensions.
 *
 * This scenario validates the dashboard handles empty states gracefully and
 * provides appropriate zero-count statistics.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account
 * 2. Retrieve the dashboard overview immediately without creating any data
 * 3. Verify all arrays are empty (pending_reports, under_review_reports,
 *    recent_moderation_actions, active_suspensions)
 * 4. Verify all statistics show zero values
 * 5. Verify average_report_resolution_time_hours is null
 */
export async function test_api_moderation_dashboard_overview_empty_state(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Retrieve the moderation dashboard overview immediately
  const dashboardOverview =
    await api.functional.discussionBoard.moderator.moderation.dashboard.overview(
      connection,
    );
  typia.assert(dashboardOverview);

  // Step 3: Verify all arrays are empty
  TestValidator.equals(
    "pending_reports should be empty array",
    dashboardOverview.pending_reports,
    [],
  );

  TestValidator.equals(
    "under_review_reports should be empty array",
    dashboardOverview.under_review_reports,
    [],
  );

  TestValidator.equals(
    "recent_moderation_actions should be empty array",
    dashboardOverview.recent_moderation_actions,
    [],
  );

  TestValidator.equals(
    "active_suspensions should be empty array",
    dashboardOverview.active_suspensions,
    [],
  );

  // Step 4: Verify all statistics show zero values
  const stats = dashboardOverview.statistics;

  TestValidator.equals(
    "pending_reports_count should be 0",
    stats.pending_reports_count,
    0,
  );

  TestValidator.equals(
    "under_review_reports_count should be 0",
    stats.under_review_reports_count,
    0,
  );

  TestValidator.equals(
    "resolved_reports_count_24h should be 0",
    stats.resolved_reports_count_24h,
    0,
  );

  TestValidator.equals(
    "active_suspensions_count should be 0",
    stats.active_suspensions_count,
    0,
  );

  TestValidator.equals(
    "warnings_issued_count_7d should be 0",
    stats.warnings_issued_count_7d,
    0,
  );

  TestValidator.equals(
    "total_moderation_actions_count_24h should be 0",
    stats.total_moderation_actions_count_24h,
    0,
  );

  TestValidator.equals(
    "urgent_reports_count should be 0",
    stats.urgent_reports_count,
    0,
  );

  // Step 5: Verify average_report_resolution_time_hours is null
  TestValidator.equals(
    "average_report_resolution_time_hours should be null when no reports resolved",
    stats.average_report_resolution_time_hours,
    null,
  );
}
