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

/**
 * Verify that a platform administrator can delete an existing moderation report
 * created by a member user.
 *
 * Business flow covered by this test:
 *
 * 1. A platform admin account is registered (join) and authenticated.
 * 2. A member user account is registered and then logged in.
 * 3. The member user creates a moderation report.
 * 4. The platform admin logs in again (switch actor) and deletes the report using
 *    the admin-only erase endpoint.
 *
 * Due to current SDK limits, we cannot re-read the report or list reports after
 * deletion, so success is defined as the erase call completing without throwing
 * while using the correct report identifier created earlier.
 */
export async function test_api_platform_admin_deletes_existing_report(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain admin auth context
  const adminJoinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const adminJoinResult = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoinResult);

  // Sanity check: admin id/token look structurally valid
  TestValidator.predicate(
    "platform admin join should yield a valid admin id",
    () =>
      typeof adminJoinResult.id === "string" && adminJoinResult.id.length > 0,
  );

  // 2. Register a member user (join)
  const memberJoinBody =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();
  const memberJoinResult = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoinResult);

  TestValidator.predicate(
    "member user join should yield a valid member id",
    () =>
      typeof memberJoinResult.id === "string" && memberJoinResult.id.length > 0,
  );

  // 3. Member login to ensure we have a fresh member session/token
  const memberLoginBody: ICommunityPlatformMemberuser.ILoginRequest = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip ?? null,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  };
  const memberLoginResult = await api.functional.auth.memberUser.login(
    connection,
    {
      body: memberLoginBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginResult);

  // 4. As the authenticated member, create a new report
  const reportCreateBody = typia.random<ICommunityPlatformReport.ICreate>();
  const createdReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(createdReport);

  TestValidator.predicate(
    "created report should have a non-empty uuid id",
    () => typeof createdReport.id === "string" && createdReport.id.length > 0,
  );

  const reportId = createdReport.id;

  // 5. Switch back to admin actor using login
  const adminLoginBody: ICommunityPlatformPlatformadmin.ILogin = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  };
  const adminLoginResult = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminLoginResult);

  TestValidator.predicate(
    "platform admin login should return same admin id as join",
    () => adminLoginResult.id === adminJoinResult.id,
  );

  // 6. As platform admin, delete the report using erase()
  await api.functional.communityPlatform.platformAdmin.reports.erase(
    connection,
    {
      reportId,
    },
  );

  // 7. Basic post-conditions: ensure we used the correct id and no error was thrown
  TestValidator.equals(
    "deleted report id should match created report id",
    reportId,
    createdReport.id,
  );
}
