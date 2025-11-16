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

/**
 * Verify that the admin-only user report search endpoint enforces
 * authentication and role-based access.
 *
 * Business context: Administrative moderators must be able to search and
 * paginate user reports for triage, but these reports contain sensitive
 * behavioral and moderation data that must not be exposed to unauthenticated
 * callers or regular member users. The PATCH
 * /communityPlatform/adminUser/userReports endpoint is therefore restricted to
 * the adminUser actor.
 *
 * This test validates that:
 *
 * - An unauthenticated connection cannot call the admin search endpoint
 *   successfully.
 * - An authenticated memberUser cannot use the admin search endpoint.
 * - An authenticated adminUser can use the search endpoint and retrieve existing
 *   reports.
 *
 * Scenario steps:
 *
 * 1. Register a memberUser and stay authenticated as that member.
 * 2. As the memberUser, create a user report against the same member (self-report
 *    is acceptable for test).
 * 3. Prepare a reusable search payload for admin userReports.index.
 * 4. Build an unauthenticated connection (headers: {}) and call the admin search
 *    endpoint, expecting failure.
 * 5. Using a member-authenticated connection, call the admin search endpoint,
 *    expecting failure.
 * 6. Register an adminUser account, which authenticates the shared connection as
 *    admin.
 * 7. Call the admin search endpoint again as adminUser and expect a successful
 *    paginated result containing at least one user report.
 */
export async function test_api_admin_user_reports_search_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register a memberUser and keep its credentials for later login.
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = `${RandomGenerator.alphabets(8)}@example.com`;
  const memberPassword: string = "P@ssw0rd!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail as string & tags.Format<"email">,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/register" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As the memberUser, create a user report against this member.
  const reportCreateBody = {
    reported_memberuser_id: memberAuthorized.id,
    reason_category: "test_harassment",
    reason_detail:
      "Automated test report for admin search authorization scenario.",
    status: "open",
    severity: "low",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const createdReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // Prepare a reusable search payload with minimal pagination.
  const searchRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformUserReport.IRequest;

  // 4. Unauthenticated connection attempt: expect failure when calling admin search.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot access admin userReports index",
    async () => {
      await api.functional.communityPlatform.adminUser.userReports.index(
        unauthenticatedConnection,
        {
          body: searchRequest,
        },
      );
    },
  );

  // 5. Member-authenticated attempt: the current `connection` still holds member auth.
  await TestValidator.error(
    "memberUser cannot access admin userReports index",
    async () => {
      await api.functional.communityPlatform.adminUser.userReports.index(
        connection,
        {
          body: searchRequest,
        },
      );
    },
  );

  // 6. Register an adminUser, which will switch the shared connection to admin context.
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = `${RandomGenerator.alphabets(8)}@admin.example.com`;
  const adminPassword: string = "Adm1nP@ss!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail as string & tags.Format<"email">,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. As adminUser, perform the search and expect success with at least one report.
  const pageResult: IPageICommunityPlatformUserReport.ISummary =
    await api.functional.communityPlatform.adminUser.userReports.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(pageResult);

  TestValidator.predicate(
    "admin search returns at least one user report",
    pageResult.pagination.records >= 1 && pageResult.data.length >= 1,
  );
}
