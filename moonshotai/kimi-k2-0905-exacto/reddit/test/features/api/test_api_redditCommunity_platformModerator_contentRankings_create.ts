import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityContentRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentRanking";

export async function test_api_redditCommunity_platformModerator_contentRankings_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityContentRanking =
    await api.functional.redditCommunity.platformModerator.contentRankings.create(
      connection,
      {
        body: typia.random<IRedditCommunityContentRanking.ICreate>(),
      },
    );
  typia.assert(output);
}
