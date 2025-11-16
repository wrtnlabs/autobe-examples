import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";

export async function test_api_redditCommunity_communities_discover_trending_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.discover.trending.index(
      connection,
    );
  typia.assert(output);
}
