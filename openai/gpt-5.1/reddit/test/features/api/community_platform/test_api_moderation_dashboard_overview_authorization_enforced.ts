import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboard";
import type { ICommunityPlatformModerationDashboardAccountRestrictionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardAccountRestrictionSummary";
import type { ICommunityPlatformModerationDashboardActionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardActionSummary";
import type { ICommunityPlatformModerationDashboardReportBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationDashboardReportBreakdown";

/**
 * Verify authorization enforcement for the moderation dashboard overview.
 *
 * Business goal: Ensure that the aggregated moderation dashboard at GET
 * /communityPlatform/adminUser/morederation/dashboard/overview is only
 * accessible to authenticated adminUser actors. Requests coming from memberUser
 * actors or unauthenticated clients must be rejected by the backend, while a
 * properly authenticated adminUser should receive a well-formed
 * ICommunityPlatformModerationDashboard payload.
 *
 * Scenario steps:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join, which also establishes
 *    an authenticated admin session on the shared connection.
 * 2. As this adminUser, call GET
 *    /communityPlatform/adminUser/moderation/dashboard/overview and assert that
 *    a valid ICommunityPlatformModerationDashboard is returned.
 * 3. Register a memberUser via POST /auth/memberUser/join on the same connection,
 *    which switches the Authorization header to a member token.
 * 4. As this memberUser, attempt to call the same dashboard overview endpoint and
 *    assert that the call fails with an error (authorization enforced), without
 *    asserting any specific HTTP status code.
 * 5. Create a separate unauthenticated connection object and attempt to call the
 *    dashboard overview endpoint again, asserting that the call also fails for
 *    a client without any Authorization header.
 *
 * This test confirms that only adminUser actors can consume sensitive
 * moderation metrics, and that both memberUser and unauthenticated contexts are
 * rejected by the authorization layer.
 */
export async function test_api_moderation_dashboard_overview_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and establish admin context on the connection
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As adminUser, call moderation dashboard overview and assert success
  const dashboard: ICommunityPlatformModerationDashboard =
    await api.functional.communityPlatform.adminUser.moderation.dashboard.overview.at(
      connection,
    );
  typia.assert(dashboard);

  // 3. Register a memberUser, which switches the Authorization header
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, attempting to access the admin-only dashboard must fail
  await TestValidator.error(
    "memberUser cannot access moderation dashboard overview",
    async () => {
      await api.functional.communityPlatform.adminUser.moderation.dashboard.overview.at(
        connection,
      );
    },
  );

  // 5. Create an unauthenticated connection by clearing headers and assert failure
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated client cannot access moderation dashboard overview",
    async () => {
      await api.functional.communityPlatform.adminUser.moderation.dashboard.overview.at(
        unauthConnection,
      );
    },
  );
}
