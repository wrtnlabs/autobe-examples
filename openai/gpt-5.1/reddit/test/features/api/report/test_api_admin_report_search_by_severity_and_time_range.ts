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

export async function test_api_admin_report_search_by_severity_and_time_range(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a report reason category as platform admin
  const reasonCode = `harassment_${RandomGenerator.alphaNumeric(8)}`;
  const reasonCreateBody = {
    code: reasonCode,
    name: "Harassment Test Category",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reasonCreateBody },
    );
  typia.assert(reasonCategory);

  // 3. Register and authenticate a member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: undefined,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Explicitly login as memberUser to ensure session context is correct
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: undefined,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. Create multiple reports as the member user
  const distinctiveKeyword = "harassment test case";

  // Report A: low severity, older
  const reportALowBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportALow: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportALowBody },
    );
  typia.assert(reportALow);

  // Report B: high severity, with distinctive keyword
  const reportBHighBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    severity: "high",
    description: `${distinctiveKeyword} - ${RandomGenerator.paragraph({
      sentences: 4,
    })}`,
  } satisfies ICommunityPlatformReport.ICreate;

  const reportBHigh: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBHighBody },
    );
  typia.assert(reportBHigh);

  // Report C: medium severity, no keyword
  const reportCMediumBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportCMedium: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCMediumBody },
    );
  typia.assert(reportCMedium);

  // 5. Switch back to platform admin account for searching
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: undefined,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. First, perform an unfiltered search to find the createdAt of the high severity report
  const seedSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformReport.IRequest;

  const seedPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.index(
      connection,
      { body: seedSearchBody },
    );
  typia.assert(seedPage);

  const allSeedSummaries: ICommunityPlatformReport.ISummary[] = seedPage.data;

  const targetSummary: ICommunityPlatformReport.ISummary | undefined =
    allSeedSummaries.find((s) => s.id === reportBHigh.id);

  TestValidator.predicate(
    "high severity report summary should exist in seed search",
    targetSummary !== undefined,
  );

  if (!targetSummary) return;

  const targetCreatedAt: string & tags.Format<"date-time"> =
    targetSummary.createdAt as string & tags.Format<"date-time">;

  // Build a narrow time window around targetCreatedAt
  const targetDate = new Date(targetCreatedAt);
  const createdFrom = new Date(targetDate.getTime() - 60 * 1000).toISOString();
  const createdTo = new Date(targetDate.getTime() + 60 * 1000).toISOString();

  // 7. Search with filters: severity = ["high"], created_at window, description_query
  const filteredSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    severity_levels: ["high"],
    created_from: createdFrom,
    created_to: createdTo,
    description_query: distinctiveKeyword,
  } satisfies ICommunityPlatformReport.IRequest;

  const filteredPage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.index(
      connection,
      { body: filteredSearchBody },
    );
  typia.assert(filteredPage);

  const pagination: IPage.IPagination = filteredPage.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "filtered search should report exactly one matching record in pagination",
    1,
    pagination.records,
  );

  const filteredSummaries: ICommunityPlatformReport.ISummary[] =
    filteredPage.data;

  TestValidator.equals(
    "filtered search should return exactly one summary in data",
    1,
    filteredSummaries.length,
  );

  const onlySummary: ICommunityPlatformReport.ISummary = filteredSummaries[0];

  TestValidator.equals(
    "summary id should match created high severity report id",
    onlySummary.id,
    reportBHigh.id,
  );

  TestValidator.equals(
    "summary reason category id should match created reason category id",
    onlySummary.reasonCategory.id,
    reasonCategory.id,
  );

  TestValidator.equals(
    "summary status should be non-empty string",
    true,
    onlySummary.status.length > 0,
  );

  // 8. Optional: widen the time window and remove severity filter to ensure other reports appear
  const wideSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    description_query: null,
  } satisfies ICommunityPlatformReport.IRequest;

  const widePage: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.index(
      connection,
      { body: wideSearchBody },
    );
  typia.assert(widePage);

  const wideSummaries: ICommunityPlatformReport.ISummary[] = widePage.data;

  const containsLow = wideSummaries.some((s) => s.id === reportALow.id);
  const containsHigh = wideSummaries.some((s) => s.id === reportBHigh.id);
  const containsMedium = wideSummaries.some((s) => s.id === reportCMedium.id);

  TestValidator.predicate(
    "wide search should include low severity report",
    containsLow,
  );
  TestValidator.predicate(
    "wide search should include high severity report",
    containsHigh,
  );
  TestValidator.predicate(
    "wide search should include medium severity report",
    containsMedium,
  );
}
