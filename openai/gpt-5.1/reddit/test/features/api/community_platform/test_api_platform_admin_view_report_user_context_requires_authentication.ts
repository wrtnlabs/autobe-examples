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
import type { ICommunityPlatformReportOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfUsers";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformReportUserReportedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserReportedUser";
import type { ICommunityPlatformReportUserReporter } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserReporter";
import type { ICommunityPlatformReportUserTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportUserTarget";

/**
 * Validate that the platformAdmin user-context report view endpoint enforces
 * authentication and only returns data to authorized platform administrators.
 *
 * Business goals:
 *
 * - Ensure that GET /communityPlatform/platformAdmin/reports/{reportId}/user
 *   cannot be called anonymously (no Authorization header).
 * - Ensure that a properly authenticated platformAdmin can successfully call this
 *   endpoint and receive a structurally valid ICommunityPlatformReportOfUsers
 *   instance for a real report.
 *
 * Scenario steps:
 *
 * 1. Register and login a memberUser.
 * 2. As the memberUser, create a report via POST
 *    /communityPlatform/memberUser/reports and capture the created report id.
 * 3. Using an unauthenticated connection (no Authorization header), attempt to
 *    call GET /communityPlatform/platformAdmin/reports/{reportId}/user and
 *    assert that it fails with an error (authorization required).
 * 4. Register a platformAdmin via POST /auth/platformAdmin/join, which
 *    authenticates the shared connection as platformAdmin.
 * 5. Call GET /communityPlatform/platformAdmin/reports/{reportId}/user again using
 *    the authenticated platformAdmin connection and assert success.
 * 6. Validate that the returned report-of-users object has the same id as the
 *    original report and passes typia structural validation.
 */
export async function test_api_platform_admin_view_report_user_context_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a member user (self-registration) to act as the reporter
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Use realistic URLs for href and referrer
    href: "https://client.example.com/register",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 1-2. Log in as the member user explicitly to simulate a real login flow
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);

  // 2. As the authenticated memberUser, create a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(createdReport);

  const reportId: string & tags.Format<"uuid"> = createdReport.id;

  // 3. Attempt to access the platformAdmin report user-context endpoint
  //    without any Authorization header (simulate anonymous caller).
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous access to platformAdmin report user view must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.user.at(
        unauthenticatedConnection,
        {
          reportId,
        },
      );
    },
  );

  // 4. Register a platform administrator (join also authenticates the connection)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 5. With the connection now authenticated as platformAdmin, call the
  //    report user-context view endpoint again and expect success.
  const reportOfUsers: ICommunityPlatformReportOfUsers =
    await api.functional.communityPlatform.platformAdmin.reports.user.at(
      connection,
      {
        reportId,
      },
    );
  typia.assert<ICommunityPlatformReportOfUsers>(reportOfUsers);

  // 6. Assert that the returned report-of-users refers to the same report id
  TestValidator.equals(
    "platformAdmin report-of-users id matches created report id",
    reportOfUsers.id,
    reportId,
  );

  // Additional sanity checks on key fields using predicates (business-level)
  await TestValidator.predicate(
    "report-of-users status should be a non-empty string",
    async () => reportOfUsers.status.length > 0,
  );
  await TestValidator.predicate(
    "report-of-users targetScope should be a non-empty string",
    async () => reportOfUsers.targetScope.length > 0,
  );
  await TestValidator.predicate(
    "report-of-users reasonCategory should be a non-empty string",
    async () => reportOfUsers.reasonCategory.length > 0,
  );
}
