import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAnalyticsCommonTimeWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAnalyticsCommonTimeWindow";
import type { ICommunityPlatformModerationAnalyticsWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAnalyticsWorkload";
import type { ICommunityPlatformModerationAnalyticsWorkloadCaseStatusBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAnalyticsWorkloadCaseStatusBucket";
import type { ICommunityPlatformModerationAnalyticsWorkloadCommunityBacklogBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAnalyticsWorkloadCommunityBacklogBucket";

/**
 * Validate that moderation workload analytics accepts assigned admin filters
 * and time windows while returning structurally correct analytics objects.
 *
 * Business context:
 *
 * - Admin users (adminUser actors) can request aggregated moderation workload
 *   analytics over moderation cases and reports.
 * - The analytics endpoint supports filtering by creation time range and by
 *   assigned admin user IDs, so that dashboards can focus on specific
 *   moderators or teams.
 * - However, underlying moderation case creation/assignment APIs are not exposed
 *   in this test fixture, so we cannot control exact case counts.
 *
 * Test strategy (adapted):
 *
 * 1. Register two admin users (admin A and admin B) via POST /auth/adminUser/join.
 *
 *    - Capture each admin's id from ICommunityPlatformAdminuser.IAuthorized.
 *    - This also authenticates the connection as the last joined admin.
 * 2. Build a wide time window (from 7 days ago until now) so that any existing
 *    moderation data in the environment is included.
 * 3. Call PATCH /communityPlatform/adminUser/moderation/analytics/workload as the
 *    current admin with a request body that sets:
 *
 *    - CreatedAtFrom/createdAtTo to the 7-day window
 *    - AssignedAdminUserIds to [adminA.id] Assert:
 *    - Response conforms to ICommunityPlatformModerationAnalyticsWorkload via
 *         typia.assert.
 *    - All numeric counters are non-negative.
 *    - TimeWindow.from/to are valid date-time strings and within or equal to the
 *         requested range.
 * 4. Call the same endpoint with assignedAdminUserIds set to [adminB.id] while
 *    still authenticated as the last joined admin (admin B). Again assert
 *    structural correctness and non-negative counts.
 * 5. Call again with assignedAdminUserIds set to [adminA.id, adminB.id] and once
 *    more with assignedAdminUserIds omitted altogether, asserting that each
 *    call returns a valid analytics object.
 *
 * NOTE: Because we do not control underlying moderation data nor have mutation
 * APIs for cases/reports, we DO NOT assert exact equality relationships between
 * results of different filters (e.g., that totals differ between admin A and
 * B). Instead, this test focuses on:
 *
 * - Correct acceptance of assignedAdminUserIds as a filter parameter
 * - Validity and stability of the analytics response shape
 * - Reasonable invariants such as non-negative counters and consistent timeWindow
 *   semantics.
 */
export async function test_api_moderation_workload_analytics_assigned_admin_filter(
  connection: api.IConnection,
) {
  // 1. Register admin A
  const adminAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. Register admin B (this also authenticates as admin B)
  const adminBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // Helper to build a time range covering recent activity (last 7 days).
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const createdAtFrom: string & tags.Format<"date-time"> =
    sevenDaysAgo.toISOString() as string & tags.Format<"date-time">;
  const createdAtTo: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;

  // Utility to assert common invariants on the workload response.
  const assertWorkload = (
    title: string,
    workload: ICommunityPlatformModerationAnalyticsWorkload,
    requestFrom?: string & tags.Format<"date-time">,
    requestTo?: string & tags.Format<"date-time">,
  ): void => {
    typia.assert<ICommunityPlatformModerationAnalyticsWorkload>(workload);

    // Basic non-negative numeric counters are already enforced by tags, but we
    // add explicit predicates for clearer test reporting.
    TestValidator.predicate(
      `${title}: totalOpenCases is non-negative`,
      workload.totalOpenCases >= 0,
    );
    TestValidator.predicate(
      `${title}: totalInProgressCases is non-negative`,
      workload.totalInProgressCases >= 0,
    );
    TestValidator.predicate(
      `${title}: totalResolvedCases is non-negative`,
      workload.totalResolvedCases >= 0,
    );
    TestValidator.predicate(
      `${title}: newCasesInRange is non-negative`,
      workload.newCasesInRange >= 0,
    );
    TestValidator.predicate(
      `${title}: newReportsInRange is non-negative`,
      workload.newReportsInRange >= 0,
    );
    TestValidator.predicate(
      `${title}: postReportCount is non-negative`,
      workload.postReportCount >= 0,
    );
    TestValidator.predicate(
      `${title}: commentReportCount is non-negative`,
      workload.commentReportCount >= 0,
    );
    TestValidator.predicate(
      `${title}: communityReportCount is non-negative`,
      workload.communityReportCount >= 0,
    );
    TestValidator.predicate(
      `${title}: userReportCount is non-negative`,
      workload.userReportCount >= 0,
    );

    // Ensure arrays and timeWindow exist and have reasonable structure.
    TestValidator.predicate(
      `${title}: caseStatusBreakdown array is defined`,
      Array.isArray(workload.caseStatusBreakdown),
    );
    TestValidator.predicate(
      `${title}: backlogByCommunity array is defined`,
      Array.isArray(workload.backlogByCommunity),
    );

    const tw: ICommunityPlatformModerationAnalyticsCommonTimeWindow =
      workload.timeWindow;
    typia.assert<ICommunityPlatformModerationAnalyticsCommonTimeWindow>(tw);

    const fromDate = new Date(tw.from);
    const toDate = new Date(tw.to);
    TestValidator.predicate(
      `${title}: timeWindow.from precedes timeWindow.to`,
      fromDate.getTime() <= toDate.getTime(),
    );

    if (requestFrom !== undefined) {
      const reqFromDate = new Date(requestFrom);
      TestValidator.predicate(
        `${title}: timeWindow.from is not earlier than requested createdAtFrom`,
        fromDate.getTime() >= reqFromDate.getTime(),
      );
    }
    if (requestTo !== undefined) {
      const reqToDate = new Date(requestTo);
      TestValidator.predicate(
        `${title}: timeWindow.to is not later than requested createdAtTo`,
        toDate.getTime() <= reqToDate.getTime(),
      );
    }
  };

  // 3. Call analytics as the current admin (admin B) but filter on admin A only.
  const workloadForAdminA: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      {
        body: {
          createdAtFrom,
          createdAtTo,
          assignedAdminUserIds: [adminA.id],
        } satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest,
      },
    );
  assertWorkload(
    "filter admin A while authenticated as admin B",
    workloadForAdminA,
    createdAtFrom,
    createdAtTo,
  );

  // 4. Call analytics filtered on admin B only.
  const workloadForAdminB: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      {
        body: {
          createdAtFrom,
          createdAtTo,
          assignedAdminUserIds: [adminB.id],
        } satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest,
      },
    );
  assertWorkload(
    "filter admin B",
    workloadForAdminB,
    createdAtFrom,
    createdAtTo,
  );

  // 5. Call analytics with both admin IDs.
  const workloadForBoth: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      {
        body: {
          createdAtFrom,
          createdAtTo,
          assignedAdminUserIds: [adminA.id, adminB.id],
        } satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest,
      },
    );
  assertWorkload(
    "filter admin A and B",
    workloadForBoth,
    createdAtFrom,
    createdAtTo,
  );

  // 6. Call analytics without any assignedAdminUserIds filter (all admins).
  const workloadForAllAdmins: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      {
        body: {
          createdAtFrom,
          createdAtTo,
        } satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest,
      },
    );
  assertWorkload(
    "no assigned admin filter",
    workloadForAllAdmins,
    createdAtFrom,
    createdAtTo,
  );
}
