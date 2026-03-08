import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformDashboard";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the empty state of the admin moderation dashboard when admin has no moderator privileges.
 *
 * This test validates that the dashboard gracefully handles admins without any moderator
 * responsibilities by returning all empty arrays instead of errors or missing fields.
 */
export async function test_api_admin_moderator_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account without any moderator privileges
  const adminAuth: IRedditPlatformAdmin.IAuthorized =
    await authorize_admin_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // Step 2: Create admin-specific connection with the token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // Step 3: Access the moderation dashboard
  const dashboard: IRedditPlatformDashboard =
    await api.functional.redditPlatform.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // Step 4: Validate all four dashboard sections exist but are empty arrays
  TestValidator.equals(
    "pendingReports is empty array",
    dashboard.pendingReports,
    [],
  );
  TestValidator.equals(
    "recentActivity is empty array",
    dashboard.recentActivity,
    [],
  );
  TestValidator.equals(
    "communityStats is empty array",
    dashboard.communityStats,
    [],
  );
  TestValidator.equals("activeBans is empty array", dashboard.activeBans, []);
  // Step 5: Verify structure is valid IRedditPlatformDashboard
  // All fields should be present (typia.assert already validated the structure)
  TestValidator.predicate(
    "dashboard has all required sections",
    () =>
      Array.isArray(dashboard.pendingReports) &&
      Array.isArray(dashboard.recentActivity) &&
      Array.isArray(dashboard.communityStats) &&
      Array.isArray(dashboard.activeBans),
  );
}
