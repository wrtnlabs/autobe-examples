import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityPlatformSettingMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformSettingMetrics";

export async function test_api_redditCommunity_platformModerator_dashboard_platform_metrics_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPlatformSettingMetrics =
    await api.functional.redditCommunity.platformModerator.dashboard.platform_metrics.at(
      connection,
    );
  typia.assert(output);
}
