import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunityContentRankings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityContentRankings";
import { IRedditCommunityCommunityContentRankings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityContentRankings";

export async function test_api_redditCommunity_communities_contentRankings_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunityContentRankings =
    await api.functional.redditCommunity.communities.contentRankings.index(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityCommunityContentRankings.IRequest>(),
      },
    );
  typia.assert(output);
}
