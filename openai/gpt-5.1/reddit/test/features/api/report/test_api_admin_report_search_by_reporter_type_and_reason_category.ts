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

export async function test_api_admin_report_search_by_reporter_type_and_reason_category(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authenticated context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Create two distinct report reason categories as the platform admin
  const reasonCategoryABody = {
    code: `spam_${RandomGenerator.alphaNumeric(6)}`,
    name: "Spam Category A",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategoryA: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCategoryABody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(reasonCategoryA);

  const reasonCategoryBBody = {
    code: `harassment_${RandomGenerator.alphaNumeric(6)}`,
    name: "Harassment Category B",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategoryB: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCategoryBBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(reasonCategoryB);

  // 3. Register and authenticate a member user who will submit reports
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // Ensure memberUser is logged in (join already authenticates, but also exercise login)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip ?? undefined,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);

  // 4. Create several reports as the member user with reporter_type = "member" and mixed reason categories
  const reports: ICommunityPlatformReport[] = [];

  const createReportForCategoryA = async () => {
    const body = {
      reporter_type: "member",
      report_reason_category_id: reasonCategoryA.id,
      community_id: null,
      severity: null,
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformReport.ICreate;

    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        {
          body,
        },
      );
    typia.assert<ICommunityPlatformReport>(report);
    reports.push(report);
  };

  const createReportForCategoryB = async () => {
    const body = {
      reporter_type: "member",
      report_reason_category_id: reasonCategoryB.id,
      community_id: null,
      severity: null,
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformReport.ICreate;

    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        {
          body,
        },
      );
    typia.assert<ICommunityPlatformReport>(report);
    reports.push(report);
  };

  // Create a mix of reports: 3 for Category A and 2 for Category B
  await createReportForCategoryA();
  await createReportForCategoryA();
  await createReportForCategoryA();
  await createReportForCategoryB();
  await createReportForCategoryB();

  TestValidator.predicate(
    "at least one report for each category was created",
    reports.some((r) => r.reason_category?.id === reasonCategoryA.id) &&
      reports.some((r) => r.reason_category?.id === reasonCategoryB.id),
  );

  // 5. Switch back to platform admin context via login to ensure admin auth is active
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? undefined,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminLoginAuthorized,
  );

  // 6. Call admin report search filtered by reporter_types=["member"] and reason_category_ids=[Category A]
  const searchRequestForCategoryA = {
    page: 1,
    pageSize: 50,
    reporter_types: ["member"],
    reason_category_ids: [reasonCategoryA.id],
  } satisfies ICommunityPlatformReport.IRequest;

  const searchResultForCategoryA: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.index(
      connection,
      {
        body: searchRequestForCategoryA,
      },
    );
  typia.assert<IPageICommunityPlatformReport.ISummary>(
    searchResultForCategoryA,
  );

  const summariesA = searchResultForCategoryA.data;

  // Every returned summary must match reporter type semantics and reasonCategory = Category A
  await ArrayUtil.asyncForEach(summariesA, async (summary) => {
    typia.assert<ICommunityPlatformReport.ISummary>(summary);

    TestValidator.predicate(
      "summary status should be non-empty",
      summary.status.length > 0,
    );

    TestValidator.predicate(
      "summary reporter actorType should be non-empty string",
      summary.reporter.actorType.length > 0,
    );

    TestValidator.equals(
      "summary reason category id must equal Category A id",
      summary.reasonCategory.id,
      reasonCategoryA.id,
    );

    TestValidator.notEquals(
      "summary reason category id must not equal Category B id",
      summary.reasonCategory.id,
      reasonCategoryB.id,
    );
  });

  // Ensure that at least one summary was returned for Category A
  TestValidator.predicate(
    "search result for Category A should contain at least one report",
    summariesA.length > 0,
  );

  // 7. Repeat the search for Category B to confirm filter discrimination
  const searchRequestForCategoryB = {
    page: 1,
    pageSize: 50,
    reporter_types: ["member"],
    reason_category_ids: [reasonCategoryB.id],
  } satisfies ICommunityPlatformReport.IRequest;

  const searchResultForCategoryB: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.index(
      connection,
      {
        body: searchRequestForCategoryB,
      },
    );
  typia.assert<IPageICommunityPlatformReport.ISummary>(
    searchResultForCategoryB,
  );

  const summariesB = searchResultForCategoryB.data;

  await ArrayUtil.asyncForEach(summariesB, async (summary) => {
    typia.assert<ICommunityPlatformReport.ISummary>(summary);

    TestValidator.equals(
      "summary reason category id must equal Category B id",
      summary.reasonCategory.id,
      reasonCategoryB.id,
    );

    TestValidator.notEquals(
      "summary reason category id must not equal Category A id",
      summary.reasonCategory.id,
      reasonCategoryA.id,
    );
  });

  TestValidator.predicate(
    "search result for Category B should contain at least one report",
    summariesB.length > 0,
  );
}
