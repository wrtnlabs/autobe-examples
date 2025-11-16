import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Validate platform admin report search with basic filters and pagination.
 *
 * Business goal: Ensure that a platform administrator can search moderation
 * reports using basic filter criteria (reporter type, severity levels,
 * created_at window, reason category) and receive a correctly paginated list of
 * report summaries. Also verify that underlying data is wired correctly by
 * creating concrete reports and an appeal beforehand, and that non-admin actors
 * cannot access the admin search endpoint.
 *
 * Scenario steps:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join and rely on
 *    the returned tokens (SDK automatically injects Authorization header).
 * 2. As this admin, create a report reason category via POST
 *    /communityPlatform/platformAdmin/reportReasonCategories using
 *    ICommunityPlatformReportReasonCategory.ICreate.
 * 3. Register a member user via POST /auth/memberUser/join and then log in with
 *    POST /auth/memberUser/login to get a member-authenticated connection
 *    (again handled by SDK).
 * 4. As the member user, create several moderation reports via POST
 *    /communityPlatform/memberUser/reports, all referencing the created reason
 *    category id. Vary their severity values (e.g. "low", "medium", "high").
 *    Since ICommunityPlatformReport.ICreate does not control created_at
 *    timestamps directly, we rely on server timestamps and constrain
 *    created_from/created_to around the current time.
 * 5. For one of the created reports, submit an appeal using POST
 *    /communityPlatform/memberUser/reports/{reportId}/appeals with
 *    ICommunityPlatformAppeal.ICreate to ensure appeal-related data exists for
 *    that report when searched.
 * 6. Switch the connection back to platform admin by calling POST
 *    /auth/platformAdmin/login.
 * 7. As platform admin, invoke PATCH
 *    /communityPlatform/platformAdmin/search/reports by calling
 *    api.functional.communityPlatform.platformAdmin.search.reports.index with
 *    an ICommunityPlatformReport.IRequest body that includes:
 *
 *    - Page = 1
 *    - PageSize = small number (e.g. 10)
 *    - Reporter_types filter = ["member"]
 *    - Severity_levels filter containing a chosen severity string that corresponds
 *         to at least one of the created reports
 *    - Reason_category_ids filter with the created reason category id
 *    - Created_from and created_to bounding a short window around now (we do not
 *         depend on any specific status values).
 * 8. Assert that the search response is structurally valid (typia.assert), that
 *    pagination.current equals 1, pagination.limit equals the requested
 *    pageSize, and that pagination.records is at least as large as the number
 *    of matching reports created in this test.
 * 9. Assert that every returned report summary has a non-empty status, a
 *    reasonCategory whose id and code match the created category, whose
 *    is_active flag is true, and a createdAt value within the requested
 *    created_from/created_to window.
 * 10. For the member user, attempt to call the same admin search endpoint and
 *     verify that it fails (authorization error) using TestValidator.error.
 */
export async function test_api_platform_admin_search_reports_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    displayName: RandomGenerator.name(2),
    // ip is optional string; omit it instead of sending null
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const adminAuthorizedOnJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  // 2. Create report reason category as platform admin
  const reasonCategoryBody = {
    code: `spam_${RandomGenerator.alphaNumeric(8)}`,
    name: "Spam or advertising",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;
  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCategoryBody,
      },
    );
  typia.assert(reasonCategory);

  // 3. Register and login member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorizedOnJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedOnJoin);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberAuthorizedOnLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedOnLogin);

  // 4. As member user, create several reports with varying severities
  const severityPool = ["low", "medium", "high"] as const;
  const targetSeverity = RandomGenerator.pick(severityPool);

  const now = new Date();
  const from = new Date(now.getTime() - 5 * 60 * 1000);
  const to = new Date(now.getTime() + 5 * 60 * 1000);
  const createdReports: ICommunityPlatformReport[] = [];

  const reportCount = 5;
  for (let i = 0; i < reportCount; i++) {
    const severity =
      i % 2 === 0 ? targetSeverity : RandomGenerator.pick(severityPool);
    const createReportBody = {
      reporter_type: "member",
      report_reason_category_id: reasonCategory.id,
      community_id: null,
      severity,
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformReport.ICreate;

    const created: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        {
          body: createReportBody,
        },
      );
    typia.assert(created);
    createdReports.push(created);
  }

  // 5. Create an appeal for one of the reports as member user
  const appealedReport: ICommunityPlatformReport = createdReports[0];
  const appealBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityPlatformAppeal.ICreate;
  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: appealedReport.id,
        body: appealBody,
      },
    );
  typia.assert(createdAppeal);

  // 6. Switch back to platform admin (login)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const adminAuthorizedOnLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 7. As platform admin, search reports with basic filters
  const pageSize = 10;
  const createdFromIso = from.toISOString();
  const createdToIso = to.toISOString();

  const searchRequestBody = {
    page: 1,
    pageSize,
    statuses: undefined,
    reporter_types: ["member"],
    severity_levels: [targetSeverity],
    community_ids: undefined,
    reason_category_ids: [reasonCategory.id],
    created_from: createdFromIso,
    created_to: createdToIso,
    resolved_from: null,
    resolved_to: null,
    description_query: null,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformReport.IRequest;

  const searchResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.search.reports.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(searchResult);

  const pagination: IPage.IPagination = searchResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should equal requested pageSize",
    pagination.limit,
    pageSize,
  );

  const matchingReportCount = createdReports.filter((report) => {
    if (report.severity === null || report.severity === undefined) return false;
    if (report.severity !== targetSeverity) return false;
    const createdAtTime = new Date(report.created_at).getTime();
    return createdAtTime >= from.getTime() && createdAtTime <= to.getTime();
  }).length;

  TestValidator.predicate(
    "pagination records should be at least number of matching created reports",
    pagination.records >= matchingReportCount,
  );

  searchResult.data.forEach((summary) => {
    typia.assert<ICommunityPlatformReport.ISummary>(summary);

    TestValidator.predicate(
      "summary status should be non-empty",
      summary.status.length > 0,
    );

    const reasonSummary = summary.reasonCategory;
    TestValidator.equals(
      "summary reasonCategory id should equal created category id",
      reasonSummary.id,
      reasonCategory.id,
    );
    TestValidator.equals(
      "summary reasonCategory code should equal created category code",
      reasonSummary.code,
      reasonCategory.code,
    );

    TestValidator.predicate(
      "summary reasonCategory should be active",
      reasonSummary.is_active === true,
    );

    const createdAtTime = new Date(summary.createdAt).getTime();
    TestValidator.predicate(
      "summary createdAt should be within filter window",
      createdAtTime >= from.getTime() && createdAtTime <= to.getTime(),
    );
  });

  // 10. Negative check: member user cannot call admin search endpoint
  const memberReLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login2",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberAuthorizedAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberReLoginBody,
    });
  typia.assert(memberAuthorizedAgain);

  await TestValidator.error(
    "member user must not access admin search endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.search.reports.index(
        connection,
        {
          body: searchRequestBody,
        },
      );
    },
  );
}
