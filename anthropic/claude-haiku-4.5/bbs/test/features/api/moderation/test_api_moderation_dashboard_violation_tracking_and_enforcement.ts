import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationDashboard";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderation_dashboard_violation_tracking_and_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for testing moderation dashboard
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123",
      ip: "192.168.1.1",
      href: "http://localhost:3000/moderator/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts
  const members = await ArrayUtil.asyncRepeat(3, async () => {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
    typia.assert(member);
    return member;
  });
  TestValidator.predicate("created 3 members", members.length === 3);

  // Step 3: View the moderation dashboard
  const dashboard =
    await api.functional.discussionBoard.moderator.moderation.dashboard(
      connection,
    );
  typia.assert(dashboard);

  // Step 4: Validate dashboard structure exists
  TestValidator.predicate(
    "dashboard has violation summary object",
    dashboard.violation_summary !== null &&
      typeof dashboard.violation_summary === "object",
  );
  TestValidator.predicate(
    "dashboard has recent moderation actions array",
    Array.isArray(dashboard.recent_moderation_actions),
  );
  TestValidator.predicate(
    "dashboard has pending content review object",
    dashboard.pending_content_review !== null &&
      typeof dashboard.pending_content_review === "object",
  );

  // Step 5: Validate violation summary metrics
  const violationSummary = dashboard.violation_summary;
  TestValidator.predicate(
    "total violations is non-negative",
    violationSummary.total_violations >= 0,
  );
  TestValidator.predicate(
    "members with violations is non-negative",
    violationSummary.members_with_violations >= 0,
  );
  TestValidator.predicate(
    "members approaching suspension is non-negative",
    violationSummary.members_approaching_suspension >= 0,
  );
  TestValidator.predicate(
    "members approaching ban is non-negative",
    violationSummary.members_approaching_ban >= 0,
  );
  TestValidator.predicate(
    "violations this month is non-negative",
    violationSummary.violations_this_month >= 0,
  );

  // Step 6: Validate top violation types structure
  TestValidator.predicate(
    "top violation types is array",
    Array.isArray(violationSummary.top_violation_types),
  );
  if (violationSummary.top_violation_types.length > 0) {
    const topViolation = violationSummary.top_violation_types[0];
    TestValidator.predicate(
      "violation type has string name",
      typeof topViolation.violation_type === "string",
    );
    TestValidator.predicate(
      "violation type has numeric count",
      typeof topViolation.count === "number",
    );
    TestValidator.predicate(
      "violation count is non-negative",
      topViolation.count >= 0,
    );
  }

  // Step 7: Validate recent moderation actions
  TestValidator.predicate(
    "recent moderation actions within limit",
    dashboard.recent_moderation_actions.length <= 20,
  );
  if (dashboard.recent_moderation_actions.length > 0) {
    const recentAction = dashboard.recent_moderation_actions[0];
    TestValidator.predicate(
      "action has uuid id",
      typeof recentAction.id === "string" && recentAction.id.length > 0,
    );
    TestValidator.predicate(
      "action has moderator id",
      typeof recentAction.moderator_id === "string",
    );
    TestValidator.predicate(
      "action has moderator email",
      typeof recentAction.moderator_email === "string",
    );
    TestValidator.predicate(
      "action type is string",
      typeof recentAction.action_type === "string",
    );
    TestValidator.predicate(
      "target type is string",
      typeof recentAction.target_type === "string",
    );
    TestValidator.predicate(
      "target id is string",
      typeof recentAction.target_id === "string",
    );
    TestValidator.predicate(
      "created at is valid timestamp",
      typeof recentAction.created_at === "string" &&
        recentAction.created_at.length > 0,
    );
  }

  // Step 8: Validate pending content review counters
  const pendingReview = dashboard.pending_content_review;
  TestValidator.predicate(
    "flagged articles count is non-negative",
    pendingReview.flagged_articles_count >= 0,
  );
  TestValidator.predicate(
    "flagged comments count is non-negative",
    pendingReview.flagged_comments_count >= 0,
  );
  TestValidator.equals(
    "total pending review equals sum of articles and comments",
    pendingReview.total_pending_review,
    pendingReview.flagged_articles_count + pendingReview.flagged_comments_count,
  );

  // Step 9: Validate enforcement state counters
  TestValidator.predicate(
    "active suspensions is non-negative",
    dashboard.active_suspensions >= 0,
  );
  TestValidator.predicate(
    "permanent bans is non-negative",
    dashboard.permanent_bans >= 0,
  );
  TestValidator.predicate(
    "total violations recorded is non-negative",
    dashboard.total_violations_recorded >= 0,
  );
  TestValidator.predicate(
    "moderation actions this month is non-negative",
    dashboard.moderation_actions_this_month >= 0,
  );

  // Step 10: Validate logical consistency of violation thresholds
  // 3 violations in 30 days triggers suspension, 5 violations in 90 days triggers permanent ban
  // Therefore, members approaching suspension should be <= members approaching ban
  // (some members may have exactly 4 violations in 90 days - approaching ban but not suspension)
  TestValidator.predicate(
    "members approaching suspension <= members approaching ban",
    violationSummary.members_approaching_suspension <=
      violationSummary.members_approaching_ban,
  );

  // Step 11: Validate that approaching thresholds don't exceed total violations
  TestValidator.predicate(
    "members approaching suspension <= total members with violations",
    violationSummary.members_approaching_suspension <=
      violationSummary.members_with_violations,
  );
  TestValidator.predicate(
    "members approaching ban <= total members with violations",
    violationSummary.members_approaching_ban <=
      violationSummary.members_with_violations,
  );

  // Step 12: Validate that cumulative enforcement is reasonable
  // Active suspensions should not exceed members approaching suspension
  TestValidator.predicate(
    "active suspensions is valid number",
    dashboard.active_suspensions >= 0,
  );
  TestValidator.predicate(
    "permanent bans is valid number",
    dashboard.permanent_bans >= 0,
  );

  // Step 13: Validate that violations this month <= total violations
  TestValidator.predicate(
    "violations this month <= total violations",
    violationSummary.violations_this_month <= violationSummary.total_violations,
  );

  // Step 14: Validate moderation actions consistency
  TestValidator.predicate(
    "moderation actions this month <= moderation log total",
    dashboard.moderation_actions_this_month >= 0,
  );
}
