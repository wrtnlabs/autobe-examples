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

export async function test_api_moderation_workload_analytics_with_status_and_community_filters(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to establish authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a stable time window: from now - 24h to now
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const createdAtFrom = fromDate.toISOString() as string &
    tags.Format<"date-time">;
  const createdAtTo = now.toISOString() as string & tags.Format<"date-time">;

  // Synthetic community IDs and status filters for testing
  const communityIdA = RandomGenerator.alphaNumeric(12);
  const communityIdB = RandomGenerator.alphaNumeric(12);
  const statusOpen = "open";
  const statusInProgress = "in_progress";
  const caseStatusFilter = [statusOpen, statusInProgress];

  // 3. First analytics call: single community (A) with [open, in_progress]
  const requestBodySingleCommunity = {
    createdAtFrom,
    createdAtTo,
    communityIds: [communityIdA],
    caseStatuses: caseStatusFilter,
  } satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest;

  const workloadSingle: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      {
        body: requestBodySingleCommunity,
      },
    );
  typia.assert(workloadSingle);

  // 4. Basic sanity checks on aggregate counters for first call
  TestValidator.predicate(
    "totalOpenCases is non-negative for single community",
    workloadSingle.totalOpenCases >= 0,
  );
  TestValidator.predicate(
    "totalInProgressCases is non-negative for single community",
    workloadSingle.totalInProgressCases >= 0,
  );
  TestValidator.predicate(
    "totalResolvedCases is non-negative for single community",
    workloadSingle.totalResolvedCases >= 0,
  );
  TestValidator.predicate(
    "newCasesInRange is non-negative for single community",
    workloadSingle.newCasesInRange >= 0,
  );
  TestValidator.predicate(
    "newReportsInRange is non-negative for single community",
    workloadSingle.newReportsInRange >= 0,
  );
  TestValidator.predicate(
    "postReportCount is non-negative for single community",
    workloadSingle.postReportCount >= 0,
  );
  TestValidator.predicate(
    "commentReportCount is non-negative for single community",
    workloadSingle.commentReportCount >= 0,
  );
  TestValidator.predicate(
    "communityReportCount is non-negative for single community",
    workloadSingle.communityReportCount >= 0,
  );
  TestValidator.predicate(
    "userReportCount is non-negative for single community",
    workloadSingle.userReportCount >= 0,
  );

  // 5. Validate backlogByCommunity respects communityIds filter when buckets exist
  for (const bucket of workloadSingle.backlogByCommunity) {
    typia.assert<ICommunityPlatformModerationAnalyticsWorkloadCommunityBacklogBucket>(
      bucket,
    );
    TestValidator.predicate(
      "backlogByCommunity bucket should belong to requested communityIds (single community)",
      requestBodySingleCommunity.communityIds?.includes(bucket.communityId) ??
        false,
    );
    TestValidator.predicate(
      "backlog openCaseCount is non-negative for single community bucket",
      bucket.openCaseCount >= 0,
    );
    TestValidator.predicate(
      "backlog inProgressCaseCount is non-negative for single community bucket",
      bucket.inProgressCaseCount >= 0,
    );
    TestValidator.predicate(
      "backlog resolvedCaseCount is non-negative for single community bucket",
      bucket.resolvedCaseCount >= 0,
    );
  }

  // 6. Validate caseStatusBreakdown respects caseStatuses filter semantics
  const allowedStatuses = new Set(
    requestBodySingleCommunity.caseStatuses ?? [],
  );
  for (const statusBucket of workloadSingle.caseStatusBreakdown) {
    typia.assert<ICommunityPlatformModerationAnalyticsWorkloadCaseStatusBucket>(
      statusBucket,
    );
    TestValidator.predicate(
      "caseStatusBreakdown.caseCount is non-negative",
      statusBucket.caseCount >= 0,
    );

    if (!allowedStatuses.has(statusBucket.status)) {
      TestValidator.predicate(
        "non-filtered status buckets should have zero caseCount or be absent (single community)",
        statusBucket.caseCount === 0,
      );
    }
  }

  // 7. Second analytics call: expand communityIds to include A and B
  const requestBodyTwoCommunities = {
    createdAtFrom,
    createdAtTo,
    communityIds: [communityIdA, communityIdB],
    caseStatuses: caseStatusFilter,
  } satisfies ICommunityPlatformModerationAnalyticsWorkload.IRequest;

  const workloadTwo: ICommunityPlatformModerationAnalyticsWorkload =
    await api.functional.communityPlatform.adminUser.moderation.analytics.workload.index(
      connection,
      {
        body: requestBodyTwoCommunities,
      },
    );
  typia.assert(workloadTwo);

  // 8. Sanity checks for second call
  TestValidator.predicate(
    "totalOpenCases is non-negative for two communities",
    workloadTwo.totalOpenCases >= 0,
  );
  TestValidator.predicate(
    "totalInProgressCases is non-negative for two communities",
    workloadTwo.totalInProgressCases >= 0,
  );
  TestValidator.predicate(
    "totalResolvedCases is non-negative for two communities",
    workloadTwo.totalResolvedCases >= 0,
  );
  TestValidator.predicate(
    "newCasesInRange is non-negative for two communities",
    workloadTwo.newCasesInRange >= 0,
  );
  TestValidator.predicate(
    "newReportsInRange is non-negative for two communities",
    workloadTwo.newReportsInRange >= 0,
  );
  TestValidator.predicate(
    "postReportCount is non-negative for two communities",
    workloadTwo.postReportCount >= 0,
  );
  TestValidator.predicate(
    "commentReportCount is non-negative for two communities",
    workloadTwo.commentReportCount >= 0,
  );
  TestValidator.predicate(
    "communityReportCount is non-negative for two communities",
    workloadTwo.communityReportCount >= 0,
  );
  TestValidator.predicate(
    "userReportCount is non-negative for two communities",
    workloadTwo.userReportCount >= 0,
  );

  // 9. Monotonicity checks: expanding communityIds should not reduce totals
  TestValidator.predicate(
    "totalOpenCases with two communities is >= single community",
    workloadTwo.totalOpenCases >= workloadSingle.totalOpenCases,
  );
  TestValidator.predicate(
    "totalInProgressCases with two communities is >= single community",
    workloadTwo.totalInProgressCases >= workloadSingle.totalInProgressCases,
  );
  TestValidator.predicate(
    "totalResolvedCases with two communities is >= single community",
    workloadTwo.totalResolvedCases >= workloadSingle.totalResolvedCases,
  );
  TestValidator.predicate(
    "newCasesInRange with two communities is >= single community",
    workloadTwo.newCasesInRange >= workloadSingle.newCasesInRange,
  );
  TestValidator.predicate(
    "newReportsInRange with two communities is >= single community",
    workloadTwo.newReportsInRange >= workloadSingle.newReportsInRange,
  );
  TestValidator.predicate(
    "postReportCount with two communities is >= single community",
    workloadTwo.postReportCount >= workloadSingle.postReportCount,
  );
  TestValidator.predicate(
    "commentReportCount with two communities is >= single community",
    workloadTwo.commentReportCount >= workloadSingle.commentReportCount,
  );
  TestValidator.predicate(
    "communityReportCount with two communities is >= single community",
    workloadTwo.communityReportCount >= workloadSingle.communityReportCount,
  );
  TestValidator.predicate(
    "userReportCount with two communities is >= single community",
    workloadTwo.userReportCount >= workloadSingle.userReportCount,
  );

  // 10. backLogByCommunity checks for two communities
  for (const bucket of workloadTwo.backlogByCommunity) {
    typia.assert<ICommunityPlatformModerationAnalyticsWorkloadCommunityBacklogBucket>(
      bucket,
    );
    TestValidator.predicate(
      "backlogByCommunity bucket should belong to requested communityIds (two communities)",
      requestBodyTwoCommunities.communityIds?.includes(bucket.communityId) ??
        false,
    );
    TestValidator.predicate(
      "backlog openCaseCount is non-negative for two communities bucket",
      bucket.openCaseCount >= 0,
    );
    TestValidator.predicate(
      "backlog inProgressCaseCount is non-negative for two communities bucket",
      bucket.inProgressCaseCount >= 0,
    );
    TestValidator.predicate(
      "backlog resolvedCaseCount is non-negative for two communities bucket",
      bucket.resolvedCaseCount >= 0,
    );
  }

  // 11. caseStatusBreakdown checks for two communities
  const allowedStatusesTwo = new Set(
    requestBodyTwoCommunities.caseStatuses ?? [],
  );
  for (const statusBucket of workloadTwo.caseStatusBreakdown) {
    typia.assert<ICommunityPlatformModerationAnalyticsWorkloadCaseStatusBucket>(
      statusBucket,
    );
    TestValidator.predicate(
      "caseStatusBreakdown.caseCount is non-negative for two communities",
      statusBucket.caseCount >= 0,
    );

    if (!allowedStatusesTwo.has(statusBucket.status)) {
      TestValidator.predicate(
        "non-filtered status buckets should have zero caseCount or be absent (two communities)",
        statusBucket.caseCount === 0,
      );
    }
  }
}
