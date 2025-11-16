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

export async function test_api_moderation_workload_analytics_time_window_effects(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to obtain an authorized context
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

  // 2. Prepare two time windows: a narrow recent window and a broader window
  const now = new Date();
  const hourMs = 60 * 60 * 1000;

  // narrow: last 1 hour
  const narrowFrom = new Date(now.getTime() - hourMs).toISOString();
  const narrowTo = now.toISOString();

  // wide: last 6 hours, same upper bound
  const wideFrom = new Date(now.getTime() - 6 * hourMs).toISOString();
  const wideTo = narrowTo;

  const narrowRequestBody = {
    createdAtFrom: narrowFrom,
    createdAtTo: narrowTo,
  } satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest;

  const wideRequestBody = {
    createdAtFrom: wideFrom,
    createdAtTo: wideTo,
  } satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest;

  // 3. Call workload analytics with the narrow window
  const narrowWorkload: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      { body: narrowRequestBody },
    );
  typia.assert<ICommunityPlatformModerationAnalyticsWorkload>(narrowWorkload);

  // 4. Call workload analytics with the broader window
  const wideWorkload: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      { body: wideRequestBody },
    );
  typia.assert<ICommunityPlatformModerationAnalyticsWorkload>(wideWorkload);

  // 5. Validate non-negative counts and basic structural integrity
  const validateCounts = (
    titlePrefix: string,
    workload: ICommunityPlatformModerationAnalyticsWorkload,
  ): void => {
    TestValidator.predicate(
      `${titlePrefix} totalOpenCases is non-negative`,
      workload.totalOpenCases >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} totalInProgressCases is non-negative`,
      workload.totalInProgressCases >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} totalResolvedCases is non-negative`,
      workload.totalResolvedCases >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} newCasesInRange is non-negative`,
      workload.newCasesInRange >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} newReportsInRange is non-negative`,
      workload.newReportsInRange >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} postReportCount is non-negative`,
      workload.postReportCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} commentReportCount is non-negative`,
      workload.commentReportCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} communityReportCount is non-negative`,
      workload.communityReportCount >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} userReportCount is non-negative`,
      workload.userReportCount >= 0,
    );
  };

  validateCounts("narrow window", narrowWorkload);
  validateCounts("wide window", wideWorkload);

  // 6. Validate monotonic behavior between narrow and wide windows
  TestValidator.predicate(
    "wide window totalOpenCases is >= narrow window totalOpenCases",
    wideWorkload.totalOpenCases >= narrowWorkload.totalOpenCases,
  );
  TestValidator.predicate(
    "wide window totalInProgressCases is >= narrow window totalInProgressCases",
    wideWorkload.totalInProgressCases >= narrowWorkload.totalInProgressCases,
  );
  TestValidator.predicate(
    "wide window totalResolvedCases is >= narrow window totalResolvedCases",
    wideWorkload.totalResolvedCases >= narrowWorkload.totalResolvedCases,
  );
  TestValidator.predicate(
    "wide window newCasesInRange is >= narrow window newCasesInRange",
    wideWorkload.newCasesInRange >= narrowWorkload.newCasesInRange,
  );
  TestValidator.predicate(
    "wide window newReportsInRange is >= narrow window newReportsInRange",
    wideWorkload.newReportsInRange >= narrowWorkload.newReportsInRange,
  );
  TestValidator.predicate(
    "wide window postReportCount is >= narrow window postReportCount",
    wideWorkload.postReportCount >= narrowWorkload.postReportCount,
  );
  TestValidator.predicate(
    "wide window commentReportCount is >= narrow window commentReportCount",
    wideWorkload.commentReportCount >= narrowWorkload.commentReportCount,
  );
  TestValidator.predicate(
    "wide window communityReportCount is >= narrow window communityReportCount",
    wideWorkload.communityReportCount >= narrowWorkload.communityReportCount,
  );
  TestValidator.predicate(
    "wide window userReportCount is >= narrow window userReportCount",
    wideWorkload.userReportCount >= narrowWorkload.userReportCount,
  );

  // 7. Validate that the effective time window is internally consistent
  const assertTimeWindowRange = (
    titlePrefix: string,
    timeWindow: ICommunityPlatformModerationAnalyticsCommonTimeWindow,
  ): void => {
    TestValidator.predicate(
      `${titlePrefix} timeWindow.from is before or equal to timeWindow.to`,
      new Date(timeWindow.from).getTime() <= new Date(timeWindow.to).getTime(),
    );
  };

  assertTimeWindowRange("narrow window", narrowWorkload.timeWindow);
  assertTimeWindowRange("wide window", wideWorkload.timeWindow);

  // 8. Cross-validate that the wide window's effective range fully covers
  // the narrow window's effective range, ensuring consistent semantics
  const narrowFromMs = new Date(narrowWorkload.timeWindow.from).getTime();
  const narrowToMs = new Date(narrowWorkload.timeWindow.to).getTime();
  const wideFromMs = new Date(wideWorkload.timeWindow.from).getTime();
  const wideToMs = new Date(wideWorkload.timeWindow.to).getTime();

  TestValidator.predicate(
    "wide window effective from is earlier than or equal to narrow window effective from",
    wideFromMs <= narrowFromMs,
  );
  TestValidator.predicate(
    "wide window effective to is equal to or later than narrow window effective to",
    wideToMs >= narrowToMs,
  );
}
