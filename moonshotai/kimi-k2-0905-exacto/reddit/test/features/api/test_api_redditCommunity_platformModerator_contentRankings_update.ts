import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityContentRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentRanking";

export async function test_api_redditCommunity_platformModerator_contentRankings_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityContentRanking =
    await api.functional.redditCommunity.platformModerator.contentRankings.update(
      connection,
      {
        contentRankingId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityContentRanking.IUpdate>(),
      },
    );
  typia.assert(output);
}
