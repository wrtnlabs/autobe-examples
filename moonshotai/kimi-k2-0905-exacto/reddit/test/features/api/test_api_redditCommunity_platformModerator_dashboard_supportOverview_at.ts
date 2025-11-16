import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformSettings";

export async function test_api_redditCommunity_platformModerator_dashboard_supportOverview_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPlatformSettings =
    await api.functional.redditCommunity.platformModerator.dashboard.supportOverview.at(
      connection,
    );
  typia.assert(output);
}
