import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserReport";

export async function test_api_admin_user_reports_search_by_reported_member_and_status(
  connection: api.IConnection,
) {
  // 1. Setup: create an admin user and log them in (join already authenticates)
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Keep admin credentials for later re-login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  // 2. Create two member users: target reported member (A) and another member (B)
  const memberHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberAJoinBody = {
    username: `memberA_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberAPass1" as string & tags.MinLength<8>,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAAuthorized);

  const memberBJoinBody = {
    username: `memberB_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberBPass1" as string & tags.MinLength<8>,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberBAuthorized);

  // Prepare memberB login body (we'll use memberB as the reporting user)
  const memberBLoginBody = {
    identifier: memberBJoinBody.email,
    password: memberBJoinBody.password,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  // 3. Authenticate as memberB (reporter)
  const reporterAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporterAuthorized);

  // 4. Create user reports
  const targetStatus = "open";

  // Two reports against memberA with status "open" and varying reason/severity
  const reportA1Body = {
    reported_memberuser_id: memberAAuthorized.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    status: targetStatus,
    severity: "high",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const reportA1: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: reportA1Body,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(reportA1);

  const reportA2Body = {
    reported_memberuser_id: memberAAuthorized.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    status: targetStatus,
    severity: "low",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const reportA2: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: reportA2Body,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(reportA2);

  // One control report against memberB with same status "open"
  const reportBBody = {
    reported_memberuser_id: memberBAuthorized.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    status: targetStatus,
    severity: "medium",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const reportB: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: reportBBody,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(reportB);

  // Another report against memberA but with different status (e.g. "resolved")
  const otherStatus = "resolved";
  const reportAOtherStatusBody = {
    reported_memberuser_id: memberAAuthorized.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 1 }),
    status: otherStatus,
    severity: "medium",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const reportAOtherStatus: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: reportAOtherStatusBody,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(reportAOtherStatus);

  // 5. Switch back to admin user context
  const adminRelogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminRelogin);

  // 6. Admin calls index with filters on reported_memberuser_id and status
  const searchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: targetStatus,
    reported_memberuser_id: memberAAuthorized.id,
  } satisfies ICommunityPlatformUserReport.IRequest;

  const pageResult: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.userReports.index(
      connection,
      { body: searchBody },
    );
  typia.assert<IPageICommunityPlatformUserReport.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 7. Validate pagination at least accounts for the two matching reports we created
  TestValidator.predicate(
    "pagination.records should be >= number of matching created reports",
    pagination.records >= 2,
  );

  const data: ICommunityPlatformUserReport.ISummary[] = pageResult.data;

  // 8. Validate each returned record matches filters and does not include control report B or other-status report
  for (const summary of data) {
    // All reports should be for memberA
    TestValidator.equals(
      "each summary.reportedMember.id equals target memberA id",
      summary.reportedMember.id,
      memberAAuthorized.id,
    );

    // All reports should have targetStatus
    TestValidator.equals(
      "each summary.status equals target status",
      summary.status,
      targetStatus,
    );

    // None should be for memberB
    TestValidator.notEquals(
      "no summary should have reportedMember.id equal to memberB id",
      summary.reportedMember.id,
      memberBAuthorized.id,
    );
  }

  // 9. Ensure that both reportA1 and reportA2 IDs appear in the results
  const summaryIds: string[] = data.map((s) => s.id);

  TestValidator.predicate(
    "reportA1 id should be included in admin search results",
    summaryIds.includes(reportA1.id),
  );
  TestValidator.predicate(
    "reportA2 id should be included in admin search results",
    summaryIds.includes(reportA2.id),
  );

  // Ensure that the different-status reportAOtherStatus is not included
  TestValidator.predicate(
    "report with different status should not be included in filtered results",
    !summaryIds.includes(reportAOtherStatus.id),
  );

  // Ensure that the control reportB (different reported member) is not included
  TestValidator.predicate(
    "report against other member (memberB) should not be included",
    !summaryIds.includes(reportB.id),
  );
}
