import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityContentRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentRanking";

export async function test_api_redditCommunity_communities_contentRankings_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityContentRanking =
    await api.functional.redditCommunity.communities.contentRankings.at(
      connection,
      {
        communityName: typia.random<string>(),
        contentRankingId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
