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

export async function test_api_admin_moderator_dashboard_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IRedditPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Get moderation dashboard
  const dashboard: IRedditPlatformDashboard =
    await api.functional.redditPlatform.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // 3. Validate response structure contains all required sections
  TestValidator.predicate(
    "pendingReports is an array",
    Array.isArray(dashboard.pendingReports),
  );
  TestValidator.predicate(
    "recentActivity is an array",
    Array.isArray(dashboard.recentActivity),
  );
  TestValidator.predicate(
    "communityStats is an array",
    Array.isArray(dashboard.communityStats),
  );
  TestValidator.predicate(
    "activeBans is an array",
    Array.isArray(dashboard.activeBans),
  );
}
