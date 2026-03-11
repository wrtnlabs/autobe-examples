import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeDashboard";
import type { IRedditLikeDashboardActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeDashboardActivity";
import type { IRedditLikeDashboardEngagement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeDashboardEngagement";
import type { IRedditLikeDashboardSubscriptionStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeDashboardSubscriptionStat";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_engagement_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Store credentials before joining
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUsername = RandomGenerator.name(1);
  const adminDisplayName = RandomGenerator.name();
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: adminUsername,
      displayName: adminDisplayName,
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Use stored credentials for login
  const adminAuthorized = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ILogin,
  });
  typia.assert(adminAuthorized);
  // 2. Retrieve admin dashboard
  const dashboard =
    await api.functional.redditLike.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // 3. Verify dashboard structure
  TestValidator.predicate(
    "has recent activity array",
    Array.isArray(dashboard.recentActivity),
  );
  TestValidator.predicate(
    "has engagement metrics",
    dashboard.engagementMetrics !== undefined,
  );
  TestValidator.predicate(
    "engagement metrics has upvote and downvote counts",
    dashboard.engagementMetrics !== undefined &&
      typeof dashboard.engagementMetrics.upvote_count === "number" &&
      typeof dashboard.engagementMetrics.downvote_count === "number",
  );
}
