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

export async function test_api_admin_dashboard_empty_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: email,
      password: password,
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Login as admin to establish session
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedAdmin = await authorize_admin_login(loginConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IRedditLikeAdmin.ILogin,
  });
  typia.assert(loggedAdmin);
  // 3. Fetch admin dashboard
  const dashboard =
    await api.functional.redditLike.admin.dashboard.at(loginConnection);
  typia.assert(dashboard);
  // 4. Validate empty subscription state
  TestValidator.equals(
    "no subscribed communities",
    dashboard.subscribedCommunities,
    [],
  );
  TestValidator.equals("no recent activity", dashboard.recentActivity, []);
  TestValidator.equals(
    "zero engagement metrics",
    dashboard.engagementMetrics,
    undefined,
  );
  TestValidator.equals(
    "zero subscription stats",
    dashboard.subscriptionStats,
    undefined,
  );
}
