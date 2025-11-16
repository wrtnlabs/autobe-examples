import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemConfiguration";

export async function test_api_redditCommunity_platformModerator_statistics_top_configurations_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.platformModerator.statistics.top_configurations.index(
      connection,
    );
  typia.assert(output);
}
