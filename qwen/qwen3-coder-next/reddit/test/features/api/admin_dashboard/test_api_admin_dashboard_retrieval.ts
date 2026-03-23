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

export async function test_api_admin_dashboard_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Execute: GET /redditLike/admin/dashboard
  const output =
    await api.functional.redditLike.admin.dashboard.at(adminConnection);
  typia.assert(output);
  // 3. Verify structure
  TestValidator.predicate(
    "has subscribedCommunities array",
    Array.isArray(output.subscribedCommunities),
  );
  TestValidator.predicate(
    "has recentActivity array",
    Array.isArray(output.recentActivity),
  );
  if (output.engagementMetrics !== undefined) {
    typia.assert(output.engagementMetrics);
  }
  if (output.subscriptionStats !== undefined) {
    typia.assert(output.subscriptionStats);
  }
}
