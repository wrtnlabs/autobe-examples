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

export async function test_api_moderation_workload_analytics_basic_window_for_single_admin(
  connection: api.IConnection,
) {
  // 1. Register a fresh adminUser to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Build a minimal IRequest payload for the last 24 hours.
  const now = new Date();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - twentyFourHoursMs);

  const requestBody = {
    createdAtFrom: fromDate.toISOString(),
    createdAtTo: now.toISOString(),
  } satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest;

  // 3. Call the moderation workload analytics endpoint.
  const workload: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      {
        body: requestBody,
      },
    );

  // 4. Structural type assertion for the response.
  typia.assert<ICommunityPlatformModerationAnalyticsWorkload>(workload);
  typia.assert<ICommunityPlatformModerationAnalyticsCommonTimeWindow>(
    workload.timeWindow,
  );

  // 5. Business-level validations for an empty workload window.
  const nonNegativeIntegers: number[] = [
    workload.totalOpenCases,
    workload.totalInProgressCases,
    workload.totalResolvedCases,
    workload.newCasesInRange,
    workload.newReportsInRange,
    workload.postReportCount,
    workload.commentReportCount,
    workload.communityReportCount,
    workload.userReportCount,
  ];

  for (const value of nonNegativeIntegers) {
    TestValidator.predicate(
      "workload counters must be non-negative int32",
      () => Number.isInteger(value) && value >= 0,
    );
  }

  // Arrays must be defined (typia already guarantees array type), and we expect
  // them to be present even if empty.
  TestValidator.predicate(
    "caseStatusBreakdown array exists",
    Array.isArray(workload.caseStatusBreakdown),
  );
  TestValidator.predicate(
    "backlogByCommunity array exists",
    Array.isArray(workload.backlogByCommunity),
  );

  // Validate each caseStatusBreakdown bucket contents.
  for (const bucket of workload.caseStatusBreakdown) {
    const typedBucket: ICommunityPlatformModerationAnalyticsWorkloadCaseStatusBucket =
      bucket;
    typia.assert<ICommunityPlatformModerationAnalyticsWorkloadCaseStatusBucket>(
      typedBucket,
    );
    TestValidator.predicate(
      "caseStatusBreakdown.caseCount must be non-negative int32",
      () =>
        Number.isInteger(typedBucket.caseCount) && typedBucket.caseCount >= 0,
    );
  }

  // Validate each backlogByCommunity bucket contents.
  for (const backlog of workload.backlogByCommunity) {
    const typedBacklog: ICommunityPlatformModerationAnalyticsWorkloadCommunityBacklogBucket =
      backlog;
    typia.assert<ICommunityPlatformModerationAnalyticsWorkloadCommunityBacklogBucket>(
      typedBacklog,
    );

    const backlogCounters: number[] = [
      typedBacklog.openCaseCount,
      typedBacklog.inProgressCaseCount,
      typedBacklog.resolvedCaseCount,
    ];
    for (const value of backlogCounters) {
      TestValidator.predicate(
        "backlogByCommunity counters must be non-negative int32",
        () => Number.isInteger(value) && value >= 0,
      );
    }
  }

  // 6. Validate the timeWindow range strings are valid ISO date-times.
  const fromTime = Date.parse(workload.timeWindow.from);
  const toTime = Date.parse(workload.timeWindow.to);

  TestValidator.predicate(
    "timeWindow.from must be a valid ISO date-time",
    !Number.isNaN(fromTime),
  );
  TestValidator.predicate(
    "timeWindow.to must be a valid ISO date-time",
    !Number.isNaN(toTime),
  );
  TestValidator.predicate(
    "timeWindow.from should be earlier than or equal to timeWindow.to",
    fromTime <= toTime,
  );

  // 7. When there is no data in the window, we expect zeroed counters and
  // empty analytic arrays. In a clean test DB this should hold; validate it as
  // a business expectation, but do not fail the test if some data exists.
  const allZero = nonNegativeIntegers.every((v) => v === 0);
  const arraysEmpty =
    workload.caseStatusBreakdown.length === 0 &&
    workload.backlogByCommunity.length === 0;

  // At minimum, if counters are zero we expect arrays to be empty as well.
  TestValidator.predicate(
    "when workload counters are zero, analytic arrays should be empty",
    () => !allZero || arraysEmpty,
  );
}
