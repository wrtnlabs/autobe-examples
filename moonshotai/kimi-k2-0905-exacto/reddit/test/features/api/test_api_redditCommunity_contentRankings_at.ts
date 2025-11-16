import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityContentRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentRanking";

export async function test_api_redditCommunity_contentRankings_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityContentRanking =
    await api.functional.redditCommunity.contentRankings.at(connection, {
      contentRankingId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
