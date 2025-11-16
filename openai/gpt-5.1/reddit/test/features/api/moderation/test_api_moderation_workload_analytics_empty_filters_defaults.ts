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
 * Validate default workload analytics behavior when filters are omitted.
 *
 * Business intent: This test ensures that the moderation workload analytics
 * endpoint behaves sensibly when an authenticated adminUser calls it with an
 * empty ICommunityPlatformModerationAnalyticsWorkload.IRequest body. In such a
 * call, all filters like createdAtFrom/To, communityIds, caseStatuses, and
 * assignedAdminUserIds are omitted, and the backend must apply its own default
 * time window and filter set. The test also verifies that explicitly sending a
 * minimal body that leaves those filters undefined yields the same analytics
 * snapshot, demonstrating that relying on defaults is equivalent to supplying
 * an explicit, default-like request.
 *
 * Steps:
 *
 * 1. Join as an adminUser via POST /auth/adminUser/join to establish an
 *    authenticated admin session.
 * 2. Call PATCH /communityPlatform/adminUser/moderation/analytics/workload with an
 *    empty object as IRequest.
 * 3. Assert that the response:
 *
 *    - Is a valid ICommunityPlatformModerationAnalyticsWorkload via typia.assert.
 *    - Has a non-null timeWindow with valid date-time strings for from/to.
 *    - Has all numeric counters (totals, newCasesInRange, newReportsInRange,
 *         per-entity report counts) greater than or equal to zero.
 *    - Contains non-null arrays for caseStatusBreakdown and backlogByCommunity (they
 *         may be empty, but must exist).
 * 4. Call the same endpoint again with an explicit IRequest body that still omits
 *    all filters (all properties left undefined), effectively matching the
 *    backend defaults.
 * 5. Assert that the second response is also valid and that key metrics
 *    (totalOpenCases, totalInProgressCases, totalResolvedCases,
 *    newCasesInRange, newReportsInRange, per-entity report counts) and the
 *    effective timeWindow are equal to the first call, proving that omitting
 *    filters is equivalent to relying on defaults.
 */
export async function test_api_moderation_workload_analytics_empty_filters_defaults(
  connection: api.IConnection,
) {
  // 1. Create an adminUser via join to obtain an authorized context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Call workload analytics with an empty IRequest body (all filters omitted).
  const emptyRequestBody =
    {} satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest;

  const defaultWorkload: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      {
        body: emptyRequestBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAnalyticsWorkload>(defaultWorkload);

  // 3. Basic structural and business sanity checks on the default workload.
  // Time window must be present and well-formed.
  const defaultTimeWindow: ICommunityPlatformModerationAnalyticsCommonTimeWindow =
    defaultWorkload.timeWindow;
  typia.assert<ICommunityPlatformModerationAnalyticsCommonTimeWindow>(
    defaultTimeWindow,
  );

  TestValidator.predicate(
    "default timeWindow.from must be a non-empty string",
    defaultTimeWindow.from.length > 0,
  );
  TestValidator.predicate(
    "default timeWindow.to must be a non-empty string",
    defaultTimeWindow.to.length > 0,
  );

  // All numeric counters must be non-negative by type definition; we assert via predicates
  // to capture business expectations in test output.
  TestValidator.predicate(
    "totalOpenCases must be non-negative",
    defaultWorkload.totalOpenCases >= 0,
  );
  TestValidator.predicate(
    "totalInProgressCases must be non-negative",
    defaultWorkload.totalInProgressCases >= 0,
  );
  TestValidator.predicate(
    "totalResolvedCases must be non-negative",
    defaultWorkload.totalResolvedCases >= 0,
  );
  TestValidator.predicate(
    "newCasesInRange must be non-negative",
    defaultWorkload.newCasesInRange >= 0,
  );
  TestValidator.predicate(
    "newReportsInRange must be non-negative",
    defaultWorkload.newReportsInRange >= 0,
  );
  TestValidator.predicate(
    "postReportCount must be non-negative",
    defaultWorkload.postReportCount >= 0,
  );
  TestValidator.predicate(
    "commentReportCount must be non-negative",
    defaultWorkload.commentReportCount >= 0,
  );
  TestValidator.predicate(
    "communityReportCount must be non-negative",
    defaultWorkload.communityReportCount >= 0,
  );
  TestValidator.predicate(
    "userReportCount must be non-negative",
    defaultWorkload.userReportCount >= 0,
  );

  // Ensure arrays are present (may be empty, but must not be undefined/null).
  TestValidator.predicate(
    "caseStatusBreakdown array must be defined",
    Array.isArray(defaultWorkload.caseStatusBreakdown),
  );
  TestValidator.predicate(
    "backlogByCommunity array must be defined",
    Array.isArray(defaultWorkload.backlogByCommunity),
  );

  // Additionally assert that all bucket counts are non-negative.
  for (const bucket of defaultWorkload.caseStatusBreakdown) {
    const caseStatusBucket: ICommunityPlatformModerationAnalyticsWorkloadCaseStatusBucket =
      bucket;
    typia.assert<ICommunityPlatformModerationAnalyticsWorkloadCaseStatusBucket>(
      caseStatusBucket,
    );
    TestValidator.predicate(
      `caseStatusBucket.caseCount must be non-negative for status ${caseStatusBucket.status}`,
      caseStatusBucket.caseCount >= 0,
    );
  }

  for (const bucket of defaultWorkload.backlogByCommunity) {
    const communityBucket: ICommunityPlatformModerationAnalyticsWorkloadCommunityBacklogBucket =
      bucket;
    typia.assert<ICommunityPlatformModerationAnalyticsWorkloadCommunityBacklogBucket>(
      communityBucket,
    );

    TestValidator.predicate(
      `backlogByCommunity.openCaseCount must be non-negative for community ${communityBucket.communityId}`,
      communityBucket.openCaseCount >= 0,
    );
    TestValidator.predicate(
      `backlogByCommunity.inProgressCaseCount must be non-negative for community ${communityBucket.communityId}`,
      communityBucket.inProgressCaseCount >= 0,
    );
    TestValidator.predicate(
      `backlogByCommunity.resolvedCaseCount must be non-negative for community ${communityBucket.communityId}`,
      communityBucket.resolvedCaseCount >= 0,
    );
  }

  // 4. Call the endpoint again with an explicit IRequest body that mirrors defaults.
  // Since all IRequest fields are optional, we again send an empty object. This
  // second call is used to demonstrate idempotent behavior when filters are omitted.
  const explicitDefaultRequestBody =
    {} satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest;

  const explicitDefaultWorkload: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      {
        body: explicitDefaultRequestBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAnalyticsWorkload>(
    explicitDefaultWorkload,
  );

  const explicitTimeWindow: ICommunityPlatformModerationAnalyticsCommonTimeWindow =
    explicitDefaultWorkload.timeWindow;
  typia.assert<ICommunityPlatformModerationAnalyticsCommonTimeWindow>(
    explicitTimeWindow,
  );

  // 5. Compare key metrics between the default and explicit-default calls.
  TestValidator.equals(
    "totalOpenCases should match between default and explicit-default calls",
    defaultWorkload.totalOpenCases,
    explicitDefaultWorkload.totalOpenCases,
  );
  TestValidator.equals(
    "totalInProgressCases should match between default and explicit-default calls",
    defaultWorkload.totalInProgressCases,
    explicitDefaultWorkload.totalInProgressCases,
  );
  TestValidator.equals(
    "totalResolvedCases should match between default and explicit-default calls",
    defaultWorkload.totalResolvedCases,
    explicitDefaultWorkload.totalResolvedCases,
  );
  TestValidator.equals(
    "newCasesInRange should match between default and explicit-default calls",
    defaultWorkload.newCasesInRange,
    explicitDefaultWorkload.newCasesInRange,
  );
  TestValidator.equals(
    "newReportsInRange should match between default and explicit-default calls",
    defaultWorkload.newReportsInRange,
    explicitDefaultWorkload.newReportsInRange,
  );
  TestValidator.equals(
    "postReportCount should match between default and explicit-default calls",
    defaultWorkload.postReportCount,
    explicitDefaultWorkload.postReportCount,
  );
  TestValidator.equals(
    "commentReportCount should match between default and explicit-default calls",
    defaultWorkload.commentReportCount,
    explicitDefaultWorkload.commentReportCount,
  );
  TestValidator.equals(
    "communityReportCount should match between default and explicit-default calls",
    defaultWorkload.communityReportCount,
    explicitDefaultWorkload.communityReportCount,
  );
  TestValidator.equals(
    "userReportCount should match between default and explicit-default calls",
    defaultWorkload.userReportCount,
    explicitDefaultWorkload.userReportCount,
  );

  // Compare effective time windows as well; if the backend resolves the same
  // default range for both calls, these should be identical.
  TestValidator.equals(
    "timeWindow.from should match between default and explicit-default calls",
    defaultTimeWindow.from,
    explicitTimeWindow.from,
  );
  TestValidator.equals(
    "timeWindow.to should match between default and explicit-default calls",
    defaultTimeWindow.to,
    explicitTimeWindow.to,
  );
}
