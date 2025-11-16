import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatistics";

export async function test_api_moderation_report_statistics_filtered_by_reason_and_status(
  connection: api.IConnection,
) {
  // 1. Register a community moderator (join) and keep credentials
  const moderatorUsername: string = RandomGenerator.name(1);
  const moderatorEmail: string = `${RandomGenerator.alphabets(8)}@moderator.example.com`;

  const moderatorJoinBody = {
    username: moderatorUsername,
    email: moderatorEmail as string & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://community.example.com/moderator/join" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderatorAuth);

  // 2. Register a member user who will create the reports
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = `${RandomGenerator.alphabets(8)}@member.example.com`;

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail as string & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuth);

  // 3. (Optional) Explicit login as member user to ensure session; use identifier = email
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://community.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuth);

  // 4. Create multiple reports with two distinct reason_category_ids A and B
  const reasonCategoryIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reasonCategoryIdB: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // We'll create 3 reports for A and 2 reports for B
  const reports: ICommunityPlatformReport[] = [];

  const createReportForCategory = async (
    categoryId: string & tags.Format<"uuid">,
    descriptionPrefix: string,
  ): Promise<ICommunityPlatformReport> => {
    const body = {
      reporter_type: "member",
      report_reason_category_id: categoryId,
      community_id: null,
      severity: null,
      description: `${descriptionPrefix}: ${RandomGenerator.paragraph({
        sentences: 3,
      })}`,
    } satisfies ICommunityPlatformReport.ICreate;

    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        { body },
      );
    typia.assert<ICommunityPlatformReport>(report);
    return report;
  };

  // Create reports for category A
  const reportA1 = await createReportForCategory(
    reasonCategoryIdA,
    "Report A1",
  );
  const reportA2 = await createReportForCategory(
    reasonCategoryIdA,
    "Report A2",
  );
  const reportA3 = await createReportForCategory(
    reasonCategoryIdA,
    "Report A3",
  );

  // Create reports for category B
  const reportB1 = await createReportForCategory(
    reasonCategoryIdB,
    "Report B1",
  );
  const reportB2 = await createReportForCategory(
    reasonCategoryIdB,
    "Report B2",
  );

  reports.push(reportA1, reportA2, reportA3, reportB1, reportB2);

  // Gather created_at range and choose a concrete status S to filter by
  const createdAtValues: (string & tags.Format<"date-time">)[] = reports.map(
    (r) => r.created_at,
  );

  // Convert date-time strings to Date for range calculations
  const createdDates: Date[] = createdAtValues.map((value) => new Date(value));

  const minCreatedAtMillis = Math.min(...createdDates.map((d) => d.getTime()));
  const maxCreatedAtMillis = Math.max(...createdDates.map((d) => d.getTime()));

  // Add/subtract 1 minute to create an inclusive [from, to) window around our reports
  const oneMinuteMs = 60 * 1000;
  const fromDate = new Date(minCreatedAtMillis - oneMinuteMs);
  const toDate = new Date(maxCreatedAtMillis + oneMinuteMs);

  const from: string & tags.Format<"date-time"> =
    fromDate.toISOString() as string & tags.Format<"date-time">;
  const to: string & tags.Format<"date-time"> = toDate.toISOString() as string &
    tags.Format<"date-time">;

  // Choose a status value present on the created reports
  const statusFilter: string = reports[0].status;

  // Compute expected count of our reports matching category A and statusFilter within [from, to)
  const expectedCountA_S = reports.filter((r) => {
    const createdMillis = new Date(r.created_at).getTime();
    const withinWindow =
      createdMillis >= fromDate.getTime() && createdMillis < toDate.getTime();
    return (
      r.status === statusFilter &&
      r.reason_category?.id === reasonCategoryIdA &&
      withinWindow
    );
  }).length;

  // 5. Switch authentication to community moderator (login) to ensure correct actor
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://community.example.com/moderator/login" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLoginAuth,
  );

  // 6. Build statistics request filtering for category A and chosen status
  const statsRequestBody = {
    from,
    to,
    target_types: undefined,
    reason_category_ids: [reasonCategoryIdA],
    statuses: [statusFilter],
    community_ids: undefined,
    group_by: ["reason_category", "status"],
  } satisfies ICommunityPlatformReportStatistics.IRequest;

  const stats: ICommunityPlatformReportStatistics =
    await api.functional.communityPlatform.communityModerator.statistics.reports.index(
      connection,
      { body: statsRequestBody },
    );
  typia.assert<ICommunityPlatformReportStatistics>(stats);

  // 7. Business validations
  if (expectedCountA_S > 0) {
    // We cannot guarantee there are no other matching reports in the system,
    // so we only assert that the totalCount is at least our expected count.
    TestValidator.predicate(
      "totalCount is at least the number of reports we created for category A with selected status",
      stats.totalCount >= expectedCountA_S,
    );
  } else {
    // When we have no own matches, just assert totalCount is non-negative.
    TestValidator.predicate(
      "totalCount is non-negative when we have no local matches for the chosen status and category",
      stats.totalCount >= 0,
    );
  }

  // Validate countByReasonCategory: find bucket for category A
  const bucketForA = stats.countByReasonCategory.find(
    (bucket) => bucket.reasonCategoryId === reasonCategoryIdA,
  );

  if (expectedCountA_S > 0) {
    TestValidator.predicate(
      "reason category bucket for A exists when there are matching reports",
      bucketForA !== undefined,
    );

    if (bucketForA !== undefined) {
      TestValidator.predicate(
        "reason category bucket count for A is at least the number of our matching reports",
        bucketForA.count >= expectedCountA_S,
      );
    }
  }

  // Validate countByStatus: find bucket for the selected status
  const bucketForStatus = stats.countByStatus.find(
    (bucket) => bucket.status === statusFilter,
  );

  if (expectedCountA_S > 0) {
    TestValidator.predicate(
      "status bucket for selected status exists when there are matching reports",
      bucketForStatus !== undefined,
    );

    if (bucketForStatus !== undefined) {
      TestValidator.predicate(
        "status bucket count for selected status is at least the number of our matching reports",
        bucketForStatus.count >= expectedCountA_S,
      );
    }
  }
}
