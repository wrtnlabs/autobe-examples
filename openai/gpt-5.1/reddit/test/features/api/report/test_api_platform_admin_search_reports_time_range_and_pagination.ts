import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

export async function test_api_platform_admin_search_reports_time_range_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register platform admin via join (auto-authenticates)
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(6)}`,
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Register member user via join
  const memberEmail =
    `member+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">;
  const memberJoinBody = {
    username: `member_${RandomGenerator.alphabets(6)}`,
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. As platform admin, create a report reason category
  // (connection is still admin-authenticated after platformAdmin.join)
  const reasonCategoryBody = {
    code: `reason_${RandomGenerator.alphabets(8)}`,
    name: "Abuse / Test Category",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reasonCategoryBody },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(reasonCategory);

  // 4. Switch to memberUser authentication using login
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);

  // 5. Create two temporal batches of reports as the member user: early and late
  const totalEarlyReports = 3;
  const totalLateReports = 7; // ensures > 2 pages when pageSize=3

  const createdEarlyReportIds: (string & tags.Format<"uuid">)[] = [];
  const createdLateReportIds: (string & tags.Format<"uuid">)[] = [];

  // Helper closure to create a single report
  const createReport = async () => {
    const body = {
      reporter_type: "member",
      report_reason_category_id: reasonCategory.id,
      community_id: null,
      severity: null,
      description: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ICommunityPlatformReport.ICreate;

    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        { body },
      );
    typia.assert<ICommunityPlatformReport>(report);
    return report;
  };

  // Early batch
  for (let i = 0; i < totalEarlyReports; i++) {
    const report = await createReport();
    createdEarlyReportIds.push(report.id);
  }

  // Slight delay between early and late batches using RandomGenerator.date for conceptual separation
  // (not strictly necessary, created_at should already be monotonic per insertion order)

  // Late batch
  for (let i = 0; i < totalLateReports; i++) {
    const report = await createReport();
    createdLateReportIds.push(report.id);
  }

  TestValidator.equals(
    "created early reports count",
    createdEarlyReportIds.length,
    totalEarlyReports,
  );
  TestValidator.equals(
    "created late reports count",
    createdLateReportIds.length,
    totalLateReports,
  );

  // 6. Switch back to platform admin via login
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminLoginAuthorized,
  );

  // 7. As admin, run an unfiltered search (except reason_category) to discover createdAt values
  const discoveryRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: (totalEarlyReports + totalLateReports) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    reason_category_ids: [reasonCategory.id],
    statuses: undefined,
    reporter_types: undefined,
    severity_levels: undefined,
    community_ids: undefined,
    created_from: null,
    created_to: null,
    resolved_from: null,
    resolved_to: null,
    description_query: null,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies ICommunityPlatformReport.IRequest;

  const discoveryPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.search.reports.index(
      connection,
      { body: discoveryRequestBody },
    );
  typia.assert<IPageICommunityPlatformReport.ISummary>(discoveryPage);
  typia.assert<IPage.IPagination>(discoveryPage.pagination);

  // 8. Extract createdAt timestamps for late reports by ID from discovery results
  const lateSummaries: ICommunityPlatformReport.ISummary[] =
    discoveryPage.data.filter((summary) =>
      createdLateReportIds.includes(summary.id as string & tags.Format<"uuid">),
    );

  TestValidator.equals(
    "discovery returned at least all late reports",
    lateSummaries.length,
    createdLateReportIds.length,
  );

  // Determine created_from and created_to for late window using min/max createdAt
  const lateCreatedAts = lateSummaries.map((s) => s.createdAt);
  const sortedLateCreatedAts = [...lateCreatedAts].sort();
  const createdFrom = sortedLateCreatedAts[0];
  const createdTo = sortedLateCreatedAts[sortedLateCreatedAts.length - 1];

  TestValidator.predicate(
    "late createdAt min and max should be defined",
    createdFrom.length > 0 && createdTo.length > 0,
  );

  // 9. Perform filtered, paginated searches over the late window
  const pageSize = 3 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const filteredRequestBase = {
    statuses: undefined,
    reporter_types: undefined,
    severity_levels: undefined,
    community_ids: undefined,
    reason_category_ids: [reasonCategory.id],
    created_from: createdFrom,
    created_to: createdTo,
    resolved_from: null,
    resolved_to: null,
    description_query: null,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies Omit<ICommunityPlatformReport.IRequest, "page" | "pageSize"> &
    Partial<Pick<ICommunityPlatformReport.IRequest, "page" | "pageSize">>;

  const firstPageRequestBody = {
    ...filteredRequestBase,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
  } satisfies ICommunityPlatformReport.IRequest;

  const secondPageRequestBody = {
    ...filteredRequestBase,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
  } satisfies ICommunityPlatformReport.IRequest;

  const firstPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.search.reports.index(
      connection,
      { body: firstPageRequestBody },
    );
  typia.assert<IPageICommunityPlatformReport.ISummary>(firstPage);

  const secondPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.search.reports.index(
      connection,
      { body: secondPageRequestBody },
    );
  typia.assert<IPageICommunityPlatformReport.ISummary>(secondPage);

  // 10. Validate pagination metadata
  TestValidator.predicate(
    "late window should span at least 2 pages",
    firstPage.pagination.pages >= 2,
  );
  TestValidator.predicate(
    "late window records should be at least the number of late reports",
    firstPage.pagination.records >= createdLateReportIds.length,
  );

  // 11. Collect IDs from page 1 and page 2 and ensure no overlap
  const firstPageIds = firstPage.data.map((s) => s.id);
  const secondPageIds = secondPage.data.map((s) => s.id);

  // All summaries should be within the time window and match reason category
  const assertPageWithinWindow = (
    title: string,
    page: IPageICommunityPlatformReport.ISummary,
  ) => {
    for (const summary of page.data) {
      typia.assert<ICommunityPlatformReport.ISummary>(summary);
      TestValidator.predicate(
        `${title} - report createdAt within range`,
        summary.createdAt >= createdFrom && summary.createdAt <= createdTo,
      );
      TestValidator.equals(
        `${title} - reason category code matches`,
        summary.reasonCategory.code,
        reasonCategory.code,
      );
    }
  };

  assertPageWithinWindow("first page", firstPage);
  assertPageWithinWindow("second page", secondPage);

  // Ensure no duplicate report IDs across page 1 and page 2
  const allFirstSet = new Set(firstPageIds);
  const intersection = secondPageIds.filter((id) => allFirstSet.has(id));

  TestValidator.equals(
    "no overlapping report IDs across paginated pages",
    intersection.length,
    0,
  );

  // Union of first and second page IDs must be a subset of late report IDs
  const unionIds = [...firstPageIds, ...secondPageIds];
  const lateIdSet = new Set(createdLateReportIds);
  const allContained = unionIds.every((id) => lateIdSet.has(id));

  TestValidator.predicate(
    "paginated results should only contain late-window report IDs",
    allContained,
  );
}
