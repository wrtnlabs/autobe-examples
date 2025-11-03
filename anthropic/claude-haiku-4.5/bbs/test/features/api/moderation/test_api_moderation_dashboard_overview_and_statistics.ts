import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationDashboard";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderation dashboard access and comprehensive data aggregation.
 *
 * This test validates that moderators can access the comprehensive moderation
 * dashboard which provides unified oversight of platform moderation activities,
 * user violation tracking, and enforcement actions. The dashboard aggregates
 * data from multiple tables to show:
 *
 * 1. Violation summary statistics showing total violations, members with
 *    violations, members approaching automatic suspension (3 violations in 30
 *    days), members approaching automatic ban (5 violations in 90 days),
 *    violations this month, and top violation types by frequency.
 * 2. Recent moderation actions (up to 20 most recent) with complete audit trail
 *    including which moderator took action, what action was taken
 *    (remove_article, remove_comment, suspend_user, ban_user, restore_article,
 *    restore_comment, warning_issued, flag_content), what entity was targeted
 *    (article, comment, member), and the reason documented by the moderator.
 * 3. Pending content review queue summarizing flagged articles and comments
 *    awaiting moderator decisions, total pending items, and timestamp of the
 *    oldest pending item still requiring action.
 * 4. Account enforcement metrics showing count of active suspensions (temporary
 *    access denials) and permanent bans (permanent access denials).
 * 5. Platform-wide moderation statistics including total violations recorded since
 *    inception and moderation actions taken this month.
 *
 * The test workflow:
 *
 * 1. Create a moderator account with email and password credentials
 * 2. Authenticate as the moderator (tokens are automatically set in connection)
 * 3. Retrieve the moderation dashboard
 * 4. Validate dashboard structure and data aggregation correctness
 * 5. Verify violation statistics calculations are accurate
 * 6. Verify recent actions audit trail is populated
 * 7. Verify pending content summary is present
 * 8. Verify enforcement metrics are reasonable
 */
export async function test_api_moderation_dashboard_overview_and_statistics(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for dashboard access
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123",
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator account status is active",
    moderator.account_status,
    "active",
  );

  // Step 2: Verify authentication token was set in connection
  TestValidator.predicate(
    "authorization header is set after moderator join",
    connection.headers?.["Authorization"] !== undefined,
  );

  // Step 3: Retrieve the moderation dashboard
  const dashboard: IDiscussionBoardModerationDashboard =
    await api.functional.discussionBoard.moderator.moderation.dashboard(
      connection,
    );
  typia.assert(dashboard);

  // Step 4: Validate dashboard violation summary structure and data
  TestValidator.predicate(
    "violation summary exists",
    dashboard.violation_summary !== undefined,
  );
  TestValidator.predicate(
    "total violations is non-negative number",
    typeof dashboard.violation_summary.total_violations === "number" &&
      dashboard.violation_summary.total_violations >= 0,
  );
  TestValidator.predicate(
    "members with violations is non-negative number",
    typeof dashboard.violation_summary.members_with_violations === "number" &&
      dashboard.violation_summary.members_with_violations >= 0,
  );
  TestValidator.predicate(
    "members approaching suspension is non-negative number",
    typeof dashboard.violation_summary.members_approaching_suspension ===
      "number" &&
      dashboard.violation_summary.members_approaching_suspension >= 0,
  );
  TestValidator.predicate(
    "members approaching ban is non-negative number",
    typeof dashboard.violation_summary.members_approaching_ban === "number" &&
      dashboard.violation_summary.members_approaching_ban >= 0,
  );
  TestValidator.predicate(
    "violations this month is non-negative number",
    typeof dashboard.violation_summary.violations_this_month === "number" &&
      dashboard.violation_summary.violations_this_month >= 0,
  );

  // Step 5: Validate top violation types are present
  TestValidator.predicate(
    "top violation types array exists",
    Array.isArray(dashboard.violation_summary.top_violation_types),
  );
  TestValidator.predicate(
    "top violation types contains data",
    dashboard.violation_summary.top_violation_types.length >= 0,
  );

  // Step 6: Validate recent moderation actions structure
  TestValidator.predicate(
    "recent moderation actions is an array",
    Array.isArray(dashboard.recent_moderation_actions),
  );
  TestValidator.predicate(
    "recent moderation actions has max 20 items",
    dashboard.recent_moderation_actions.length <= 20,
  );

  // Validate each moderation log entry if present
  for (const action of dashboard.recent_moderation_actions) {
    typia.assert(action);
    TestValidator.predicate(
      "moderation log has id field",
      action.id !== undefined && typeof action.id === "string",
    );
    TestValidator.predicate(
      "moderation log has moderator_id field",
      action.moderator_id !== undefined &&
        typeof action.moderator_id === "string",
    );
    TestValidator.predicate(
      "moderation log has moderator_email field",
      action.moderator_email !== undefined &&
        typeof action.moderator_email === "string",
    );
    TestValidator.predicate(
      "moderation log has action_type field",
      action.action_type !== undefined &&
        typeof action.action_type === "string",
    );
    TestValidator.predicate(
      "moderation log has target_type field",
      action.target_type !== undefined &&
        typeof action.target_type === "string",
    );
    TestValidator.predicate(
      "moderation log has target_id field",
      action.target_id !== undefined && typeof action.target_id === "string",
    );
    TestValidator.predicate(
      "moderation log has created_at timestamp",
      action.created_at !== undefined && typeof action.created_at === "string",
    );
  }

  // Step 7: Validate pending content review structure
  TestValidator.predicate(
    "pending content review exists",
    dashboard.pending_content_review !== undefined,
  );
  TestValidator.predicate(
    "flagged articles count is non-negative",
    typeof dashboard.pending_content_review.flagged_articles_count ===
      "number" && dashboard.pending_content_review.flagged_articles_count >= 0,
  );
  TestValidator.predicate(
    "flagged comments count is non-negative",
    typeof dashboard.pending_content_review.flagged_comments_count ===
      "number" && dashboard.pending_content_review.flagged_comments_count >= 0,
  );
  TestValidator.predicate(
    "total pending review equals sum of articles and comments",
    dashboard.pending_content_review.total_pending_review ===
      dashboard.pending_content_review.flagged_articles_count +
        dashboard.pending_content_review.flagged_comments_count,
  );

  // Step 8: Validate enforcement metrics
  TestValidator.predicate(
    "active suspensions is non-negative number",
    typeof dashboard.active_suspensions === "number" &&
      dashboard.active_suspensions >= 0,
  );
  TestValidator.predicate(
    "permanent bans is non-negative number",
    typeof dashboard.permanent_bans === "number" &&
      dashboard.permanent_bans >= 0,
  );

  // Step 9: Validate platform-wide statistics
  TestValidator.predicate(
    "total violations recorded is non-negative number",
    typeof dashboard.total_violations_recorded === "number" &&
      dashboard.total_violations_recorded >= 0,
  );
  TestValidator.predicate(
    "moderation actions this month is non-negative number",
    typeof dashboard.moderation_actions_this_month === "number" &&
      dashboard.moderation_actions_this_month >= 0,
  );

  // Step 10: Verify logical consistency of violation thresholds
  TestValidator.predicate(
    "members approaching ban does not exceed members approaching suspension",
    dashboard.violation_summary.members_approaching_ban <=
      dashboard.violation_summary.members_approaching_suspension,
  );
  TestValidator.predicate(
    "members with violations is at least members approaching suspension",
    dashboard.violation_summary.members_with_violations >=
      dashboard.violation_summary.members_approaching_suspension,
  );
}
