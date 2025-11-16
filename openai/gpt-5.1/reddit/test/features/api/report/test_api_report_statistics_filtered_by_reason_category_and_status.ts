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
 * Verify that report statistics can be filtered and grouped by reason category
 * and status.
 *
 * ## Business goal
 *
 * Platform admins need to be able to drill into moderation report volume for
 * specific reason categories and statuses. The statistics endpoint
 * `/communityPlatform/platformAdmin/statistics/reports` takes an
 * `ICommunityPlatformReportStatistics.IRequest` filter and returns aggregated
 * metrics in `ICommunityPlatformReportStatistics`. This test ensures that:
 *
 * 1. `reason_category_ids` acts as a hard filter: only reports whose
 *    `report_reason_category_id` is in the provided list are counted.
 * 2. `statuses` further filters to only those reports whose `status` is in the
 *    provided list.
 * 3. Grouped metrics (`countByReasonCategory`, `countByStatus`, `timeSeries`)
 *    reflect only the reports satisfying those filters.
 *
 * ## High-level flow
 *
 * 1. Create a platform admin via `/auth/platformAdmin/join`.
 * 2. Create a member user via `/auth/memberUser/join`.
 * 3. As the member user, create several reports using
 *    `api.functional.communityPlatform.memberUser.reports.create` with two
 *    different `report_reason_category_id` values (reason A and reason B).
 *
 *    - For example, create 3 reports with reason A and 2 with reason B.
 * 4. Switch back to the platform admin via `/auth/platformAdmin/login` to ensure
 *    the Authorization context is a platform admin.
 * 5. Construct an `ICommunityPlatformReportStatistics.IRequest` that:
 *
 *    - Sets `reason_category_ids` to `[reasonAId]`.
 *    - Sets `statuses` to the set of unique status values actually observed in the
 *         created reports (derived from their `status` field) so that the
 *         filter is consistent with real data.
 *    - Sets a time window (`from`, `to`) that safely includes the `created_at`
 *         timestamps of the created reports.
 *    - Sets `group_by` to include `"reason_category"` and `"status"`.
 * 6. Call
 *    `api.functional.communityPlatform.platformAdmin.statistics.reports.index`
 *    with the assembled request body.
 * 7. Assert that:
 *
 *    - `totalCount` equals the number of created reports using reason A.
 *    - `countByReasonCategory` contains a bucket for reason A whose
 *         `reasonCategoryId` matches `reasonAId` and whose `count` equals the
 *         number of reason A reports, and it does not contain a bucket for
 *         reason B.
 *    - `countByStatus` accurately reflects the distribution of the reason A reports
 *         over their statuses and does not contain statuses outside the
 *         requested set.
 *    - `timeSeries` buckets collectively count at least as many reports as there are
 *         reason A reports (allowing for possible inclusion of other data we
 *         did not create, but guaranteeing that our reports are not dropped by
 *         the filter).
 */
export async function test_api_report_statistics_filtered_by_reason_category_and_status(
  connection: api.IConnection,
) {
  // 1. Register a platform admin; this also authenticates and sets Authorization header.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(10)}@admin.example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Register a member user; this also authenticates as the member.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(10)}@member.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(16),
    ip: null,
    href: "https://community.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. As the member user, create several reports with two different reason categories.
  //    We generate two random UUIDs to stand in as distinct reason category IDs.
  const reasonAId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reasonBId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const createReportForReason = async (
    report_reason_category_id: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformReport> => {
    const createBody = {
      reporter_type: "member",
      report_reason_category_id,
      community_id: null,
      severity: null,
      description: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ICommunityPlatformReport.ICreate;
    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        { body: createBody },
      );
    typia.assert<ICommunityPlatformReport>(report);
    return report;
  };

  // Create 3 reports for reason A and 2 reports for reason B.
  const reasonAReports: ICommunityPlatformReport[] = [];
  const reasonBReports: ICommunityPlatformReport[] = [];

  for (let i = 0; i < 3; i += 1) {
    const created = await createReportForReason(reasonAId);
    reasonAReports.push(created);
  }
  for (let i = 0; i < 2; i += 1) {
    const created = await createReportForReason(reasonBId);
    reasonBReports.push(created);
  }

  TestValidator.equals(
    "created 3 reports for reason A",
    reasonAReports.length,
    3,
  );
  TestValidator.equals(
    "created 2 reports for reason B",
    reasonBReports.length,
    2,
  );

  // Derive the unique statuses present among reason A reports.
  const reasonAStatuses = Array.from(
    new Set(reasonAReports.map((r) => r.status)),
  );

  // Compute a time window that safely includes all created reports.
  const now = new Date();
  const fromDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const toDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later

  const from = fromDate.toISOString() as string & tags.Format<"date-time">;
  const to = toDate.toISOString() as string & tags.Format<"date-time">;

  // 4. Switch back to platform admin explicitly, to ensure actor context.
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login" as string &
      tags.Format<"uri">,
    referrer: "https://admin.console.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminLoginAuthorized,
  );

  // 5. Build report statistics request filtered to reason A and observed statuses.
  const statsRequestBody = {
    from,
    to,
    target_types: undefined,
    reason_category_ids: [reasonAId],
    statuses: reasonAStatuses,
    community_ids: undefined,
    group_by: ["reason_category", "status"],
  } satisfies ICommunityPlatformReportStatistics.IRequest;

  const statistics: ICommunityPlatformReportStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.reports.index(
      connection,
      { body: statsRequestBody },
    );
  typia.assert<ICommunityPlatformReportStatistics>(statistics);

  // 6. Validate totalCount equals number of reason A reports.
  TestValidator.equals(
    "totalCount matches number of reports with selected reason category",
    statistics.totalCount,
    reasonAReports.length,
  );

  // 7. Validate countByReasonCategory contains a bucket only for reason A with correct count.
  const reasonABucket = statistics.countByReasonCategory.find(
    (bucket) => bucket.reasonCategoryId === reasonAId,
  );
  TestValidator.predicate(
    "reason A bucket must be present in countByReasonCategory",
    !!reasonABucket,
  );
  if (reasonABucket) {
    TestValidator.equals(
      "reason A bucket count must equal number of reason A reports",
      reasonABucket.count,
      reasonAReports.length,
    );
  }

  const reasonBBucket = statistics.countByReasonCategory.find(
    (bucket) => bucket.reasonCategoryId === reasonBId,
  );
  TestValidator.predicate(
    "reason B bucket must not be present when filtering by reason A only",
    !reasonBBucket,
  );

  // 8. Validate countByStatus matches the distribution of reason A reports by status
  //    and does not contain statuses outside the requested set.
  const statusToCount = new Map<string, number>();
  for (const report of reasonAReports) {
    const current = statusToCount.get(report.status) ?? 0;
    statusToCount.set(report.status, current + 1);
  }

  // Every bucket should correspond to one of the requested statuses, and counts must align.
  for (const bucket of statistics.countByStatus) {
    TestValidator.predicate(
      `status bucket ${bucket.status} must be within requested statuses`,
      reasonAStatuses.includes(bucket.status),
    );
    const expectedCount = statusToCount.get(bucket.status) ?? 0;
    TestValidator.equals(
      `status bucket count matches number of reason A reports for status ${bucket.status}`,
      bucket.count,
      expectedCount,
    );
  }

  // Conversely, ensure we have a bucket for each status seen in reason A reports.
  for (const [status, expectedCount] of statusToCount.entries()) {
    const bucket = statistics.countByStatus.find((b) => b.status === status);
    TestValidator.predicate(
      `statistics must contain a status bucket for ${status}`,
      !!bucket,
    );
    if (bucket) {
      TestValidator.equals(
        `status bucket for ${status} must have correct count`,
        bucket.count,
        expectedCount,
      );
    }
  }

  // 9. Validate that timeSeries buckets collectively include at least
  //    as many reports as we created for reason A. We avoid asserting
  //    exact equality because other background data might be present.
  const totalTimeSeriesCount = statistics.timeSeries.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );
  TestValidator.predicate(
    "time series buckets must account for at least the number of reason A reports",
    totalTimeSeriesCount >= reasonAReports.length,
  );
}
