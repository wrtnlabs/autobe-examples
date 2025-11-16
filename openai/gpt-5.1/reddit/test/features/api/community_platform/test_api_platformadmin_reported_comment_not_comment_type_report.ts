import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Verify that platformAdmin cannot retrieve a reported comment for a report
 * that is not backed by a comment subtype binding.
 *
 * Business goal: Ensure GET
 * /communityPlatform/platformAdmin/reports/{reportId}/comment fails with a
 * business error when the given reportId does not correspond to a comment-based
 * report (i.e., no community_platform_report_of_comments row), while
 * authentication as platformAdmin is still valid.
 *
 * Steps:
 *
 * 1. Register a platformAdmin via /auth/platformAdmin/join.
 *
 *    - Capture admin's login identifier (email or username) and password so we can
 *         log in again later.
 *    - Typia.assert the ICommunityPlatformPlatformadmin.IAuthorized response.
 * 2. Register a memberUser via /auth/memberUser/join.
 *
 *    - This automatically authenticates as memberUser on the shared connection
 *         because the SDK sets Authorization header.
 *    - Typia.assert the ICommunityPlatformMemberuser.IAuthorized response.
 * 3. As the authenticated memberUser, create a generic report using
 *    /communityPlatform/memberUser/reports with
 *    ICommunityPlatformReport.ICreate.
 *
 *    - This produces a valid ICommunityPlatformReport and thus a reportId.
 *    - Typia.assert the ICommunityPlatformReport response.
 * 4. Switch the connection back to platformAdmin by calling
 *    /auth/platformAdmin/login with the same identifier/password captured in
 *    step 1.
 *
 *    - Typia.assert the ICommunityPlatformPlatformadmin.IAuthorized response.
 * 5. As platformAdmin, invoke GET
 *    /communityPlatform/platformAdmin/reports/{reportId}/comment using the
 *    report id from step 3.
 *
 *    - Wrap the call in TestValidator.error with an async closure to assert that it
 *         throws an error instead of returning a
 *         ICommunityPlatformReportOfComments payload.
 *    - We deliberately do not check specific HTTP status codes or error body
 *         structure, only that an error is raised (business rule violation).
 */
export async function test_api_platformadmin_reported_comment_not_comment_type_report(
  connection: api.IConnection,
) {
  // 1. Register platformAdmin and keep credentials for later login.
  const adminJoinRequest =
    typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const adminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminJoin);

  // Capture credentials for later login.
  const adminIdentifier: string = adminJoinRequest.email;
  const adminPassword: string = adminJoinRequest.password;

  // 2. Register a member user (this will authenticate as memberUser).
  const memberJoinRequest =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberJoin);

  // 3. As memberUser, create a generic report.
  const reportCreateBody = typia.random<ICommunityPlatformReport.ICreate>();
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 4. Switch back to platformAdmin via login.
  const adminLoginBody: ICommunityPlatformPlatformadmin.ILogin = {
    identifier: adminIdentifier,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 5. As platformAdmin, attempting to fetch a comment for a report that does
  //    not have a comment subtype should result in an error.
  await TestValidator.error(
    "platformAdmin comment fetch must fail for non-comment reportId",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.comment.at(
        connection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
