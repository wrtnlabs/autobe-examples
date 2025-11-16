import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityVisitorSessionUsageAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVisitorSessionUsageAnalytics";
import { IRedditCommunityVisitorSessionUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVisitorSessionUsage";

export async function test_api_redditCommunity_platformModerator_analytics_system_usage_index(
  connection: api.IConnection,
) {
  const output: IRedditCommunityVisitorSessionUsageAnalytics =
    await api.functional.redditCommunity.platformModerator.analytics.system_usage.index(
      connection,
      {
        body: typia.random<IRedditCommunityVisitorSessionUsage.IRequest>(),
      },
    );
  typia.assert(output);
}
