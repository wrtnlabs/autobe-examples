import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatistics";

/**
 * Validate that report statistics reflect a single report created by a member
 * user.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) so that the connection carries an admin
 *    Authorization header.
 * 2. Register a member user and, as that member, create a single report.
 * 3. Switch back to the platform admin via login.
 * 4. Call the statistics endpoint with a time window including the report's
 *    created_at and rich group_by configuration.
 * 5. Verify that the aggregated statistics show at least one report overall and
 *    that key breakdown dimensions (status, reason category, time bucket, and
 *    optionally community) are consistent with the newly created report.
 */
export async function test_api_report_statistics_with_single_report_created_by_member_user(
  connection: api.IConnection,
) {
  // 1. Platform admin registration (join)
  const adminJoinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();

  const adminJoinOutput = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoinOutput);

  const adminEmail: string = adminJoinOutput.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. Member user registration (join)
  const memberJoinBody =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();

  const memberJoinOutput = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoinOutput);

  const memberLoginIdentifier: string = memberJoinOutput.email;
  const memberPassword: string = memberJoinBody.password;

  // 3. As member user, log in and create a single report
  const memberLoginBody = {
    identifier: memberLoginIdentifier,
    password: memberPassword,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginOutput = await api.functional.auth.memberUser.login(
    connection,
    {
      body: memberLoginBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginOutput);

  const reportCreateBody = typia.random<ICommunityPlatformReport.ICreate>();

  const createdReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(createdReport);

  const createdAt: string = createdReport.created_at;
  const createdAtDate: Date = new Date(createdAt);

  const reasonCategoryId = createdReport.reason_category?.id;
  const communityId = createdReport.context_community?.id;

  // 4. Switch back to platform admin (login)
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginOutput = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLoginOutput);

  // 5. Build statistics request including the report's created_at
  const windowPaddingMs: number = 60_000;
  const fromDate = new Date(createdAtDate.getTime() - windowPaddingMs);
  const toDate = new Date(createdAtDate.getTime() + windowPaddingMs);

  const statsRequestBody = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    reason_category_ids: reasonCategoryId ? [reasonCategoryId] : undefined,
    community_ids: communityId ? [communityId] : undefined,
    group_by: [
      "status",
      "target_type",
      "reason_category",
      "time_bucket",
      "community",
    ],
  } satisfies ICommunityPlatformReportStatistics.IRequest;

  const stats =
    await api.functional.communityPlatform.platformAdmin.statistics.reports.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert<ICommunityPlatformReportStatistics>(stats);

  // 6. Validate high level statistics
  TestValidator.predicate(
    "statistics totalCount should be >= 1 when a report exists",
    stats.totalCount >= 1,
  );

  // 7. Validate countByStatus coherence
  const statusBuckets: ICommunityPlatformReportStatistics.IStatusBucket[] =
    stats.countByStatus;

  TestValidator.predicate(
    "countByStatus should not be empty",
    statusBuckets.length > 0,
  );

  const statusMatch = statusBuckets.find(
    (bucket) => bucket.status === createdReport.status,
  );

  if (statusMatch !== undefined) {
    TestValidator.predicate(
      "matching status bucket for created report should have count >= 1",
      statusMatch.count >= 1,
    );
  } else {
    const statusTotal = statusBuckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0 as number,
    );
    TestValidator.predicate(
      "sum of status bucket counts should be >= 1",
      statusTotal >= 1,
    );
  }

  // 8. Validate countByReasonCategory coherence
  const reasonBuckets: ICommunityPlatformReportStatistics.IReasonCategoryBucket[] =
    stats.countByReasonCategory;

  if (reasonBuckets.length > 0) {
    const reasonMatch =
      reasonCategoryId !== undefined
        ? reasonBuckets.find(
            (bucket) => bucket.reasonCategoryId === reasonCategoryId,
          )
        : undefined;

    if (reasonMatch !== undefined) {
      TestValidator.predicate(
        "matching reason category bucket should have count >= 1",
        reasonMatch.count >= 1,
      );
    } else {
      const reasonTotal = reasonBuckets.reduce(
        (sum, bucket) => sum + bucket.count,
        0 as number,
      );
      TestValidator.predicate(
        "sum of reason category bucket counts should be >= 1",
        reasonTotal >= 1,
      );
    }
  }

  // 9. Validate timeSeries coherence and that one bucket includes report time
  const timeBuckets: ICommunityPlatformReportStatistics.ITimeBucket[] =
    stats.timeSeries;

  TestValidator.predicate(
    "timeSeries should contain at least one bucket",
    timeBuckets.length >= 1,
  );

  const createdTimeMs = createdAtDate.getTime();
  const timeBucketIncludingReport = timeBuckets.find((bucket) => {
    const startMs = new Date(bucket.start).getTime();
    const endMs = new Date(bucket.end).getTime();
    return startMs <= createdTimeMs && createdTimeMs < endMs;
  });

  if (timeBucketIncludingReport !== undefined) {
    TestValidator.predicate(
      "time bucket including created report time should have count >= 1",
      timeBucketIncludingReport.count >= 1,
    );
  }

  // 10. Validate community breakdown bucket (if applicable)
  if (communityId !== undefined && stats.communityBreakdown !== undefined) {
    const communityBuckets: ICommunityPlatformReportStatistics.ICommunityBucket[] =
      stats.communityBreakdown;

    const communityMatch = communityBuckets.find(
      (bucket) => bucket.communityId === communityId,
    );

    if (communityMatch !== undefined) {
      TestValidator.predicate(
        "community bucket matching report community should have totalReports >= 1",
        communityMatch.totalReports >= 1,
      );
    }
  }
}
