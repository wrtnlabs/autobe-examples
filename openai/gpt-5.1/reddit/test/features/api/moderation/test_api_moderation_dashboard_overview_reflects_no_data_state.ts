import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboard";
import type { ICommunityPlatformModerationDashboardAccountRestrictionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardAccountRestrictionSummary";
import type { ICommunityPlatformModerationDashboardActionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardActionSummary";
import type { ICommunityPlatformModerationDashboardReportBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardReportBreakdown";

/**
 * Verify moderation dashboard overview reflects an empty/no-data state.
 *
 * Business goal: Ensure that a freshly created adminUser – with no reports,
 * cases, actions, or account restrictions in the system – can open the
 * moderation dashboard overview and see a well-formed, all-zero baseline
 * instead of errors or undefined counts. This protects the UX for new or
 * low-traffic deployments where moderation activity has not yet occurred.
 *
 * Steps:
 *
 * 1. Register an adminUser via /auth/adminUser/join, which also authenticates the
 *    connection with an admin JWT.
 * 2. Immediately call GET
 *    /communityPlatform/adminUser/moderation/dashboard/overview using the same
 *    connection (now carrying the admin token managed by the SDK).
 * 3. Assert that the response matches ICommunityPlatformModerationDashboard.
 * 4. Assert that all aggregated counters are 0, representing an empty state:
 *
 *    - OpenCaseCount, inProgressCaseCount, resolvedCaseCount, recentReportCount
 *    - Every field in each *ReportBreakdown object
 *    - Every field in recentModerationActions
 *    - Every field in activeAccountRestrictions
 */
export async function test_api_moderation_dashboard_overview_reflects_no_data_state(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Call the moderation dashboard overview as this adminUser.
  const dashboard: ICommunityPlatformModerationDashboard =
    await api.functional.communityPlatform.adminUser.moderation.dashboard.overview.at(
      connection,
    );
  typia.assert<ICommunityPlatformModerationDashboard>(dashboard);

  // 3. Top-level case and report counters must all be zero in an empty system.
  TestValidator.equals(
    "openCaseCount should be 0 in empty state",
    dashboard.openCaseCount,
    0,
  );
  TestValidator.equals(
    "inProgressCaseCount should be 0 in empty state",
    dashboard.inProgressCaseCount,
    0,
  );
  TestValidator.equals(
    "resolvedCaseCount should be 0 in empty state",
    dashboard.resolvedCaseCount,
    0,
  );
  TestValidator.equals(
    "recentReportCount should be 0 in empty state",
    dashboard.recentReportCount,
    0,
  );

  // Helper to assert that a report breakdown is fully zeroed.
  const assertZeroBreakdown = (
    titlePrefix: string,
    breakdown: ICommunityPlatformModerationDashboardReportBreakdown,
  ): void => {
    TestValidator.equals(
      `${titlePrefix}: total should be 0`,
      breakdown.total,
      0,
    );
    TestValidator.equals(`${titlePrefix}: open should be 0`, breakdown.open, 0);
    TestValidator.equals(
      `${titlePrefix}: inReview should be 0`,
      breakdown.inReview,
      0,
    );
    TestValidator.equals(
      `${titlePrefix}: resolved should be 0`,
      breakdown.resolved,
      0,
    );
  };

  assertZeroBreakdown(
    "postReportBreakdown in empty state",
    dashboard.postReportBreakdown,
  );
  assertZeroBreakdown(
    "commentReportBreakdown in empty state",
    dashboard.commentReportBreakdown,
  );
  assertZeroBreakdown(
    "communityReportBreakdown in empty state",
    dashboard.communityReportBreakdown,
  );
  assertZeroBreakdown(
    "userReportBreakdown in empty state",
    dashboard.userReportBreakdown,
  );

  // 4. Recent moderation actions summary should be fully zeroed.
  const actions: ICommunityPlatformModerationDashboardActionSummary =
    dashboard.recentModerationActions;
  TestValidator.equals(
    "recentModerationActions.totalActions should be 0 in empty state",
    actions.totalActions,
    0,
  );
  TestValidator.equals(
    "recentModerationActions.contentActions should be 0 in empty state",
    actions.contentActions,
    0,
  );
  TestValidator.equals(
    "recentModerationActions.communityActions should be 0 in empty state",
    actions.communityActions,
    0,
  );
  TestValidator.equals(
    "recentModerationActions.userActions should be 0 in empty state",
    actions.userActions,
    0,
  );

  // 5. Active account restriction snapshot should be fully zeroed.
  const restrictions: ICommunityPlatformModerationDashboardAccountRestrictionSummary =
    dashboard.activeAccountRestrictions;
  TestValidator.equals(
    "activeAccountRestrictions.totalActiveRestrictions should be 0 in empty state",
    restrictions.totalActiveRestrictions,
    0,
  );
  TestValidator.equals(
    "activeAccountRestrictions.temporaryRestrictions should be 0 in empty state",
    restrictions.temporaryRestrictions,
    0,
  );
  TestValidator.equals(
    "activeAccountRestrictions.permanentRestrictions should be 0 in empty state",
    restrictions.permanentRestrictions,
    0,
  );
  TestValidator.equals(
    "activeAccountRestrictions.contentPostingRestrictions should be 0 in empty state",
    restrictions.contentPostingRestrictions,
    0,
  );
  TestValidator.equals(
    "activeAccountRestrictions.interactionRestrictions should be 0 in empty state",
    restrictions.interactionRestrictions,
    0,
  );
}
