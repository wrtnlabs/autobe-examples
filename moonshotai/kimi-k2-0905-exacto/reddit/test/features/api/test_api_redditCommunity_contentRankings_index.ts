import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityContentRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityContentRanking";
import { IRedditCommunityContentRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentRanking";

export async function test_api_redditCommunity_contentRankings_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityContentRanking.ISummary =
    await api.functional.redditCommunity.contentRankings.index(connection, {
      body: typia.random<IRedditCommunityContentRanking.IRequest>(),
    });
  typia.assert(output);
}
