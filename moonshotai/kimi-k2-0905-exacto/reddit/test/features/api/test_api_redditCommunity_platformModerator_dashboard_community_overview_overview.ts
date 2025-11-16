import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityKarmaCalculation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaCalculation";

export async function test_api_redditCommunity_platformModerator_dashboard_community_overview_overview(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKarmaCalculation =
    await api.functional.redditCommunity.platformModerator.dashboard.community_overview.overview(
      connection,
    );
  typia.assert(output);
}
