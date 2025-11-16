import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunitySystemConfigurationOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfigurationOverview";

export async function test_api_redditCommunity_platformModerator_dashboard_system_overview_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunitySystemConfigurationOverview =
    await api.functional.redditCommunity.platformModerator.dashboard.system_overview.at(
      connection,
    );
  typia.assert(output);
}
