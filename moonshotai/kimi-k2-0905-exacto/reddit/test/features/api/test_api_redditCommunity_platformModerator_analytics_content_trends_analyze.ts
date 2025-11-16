import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityContentRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentRanking";

export async function test_api_redditCommunity_platformModerator_analytics_content_trends_analyze(
  connection: api.IConnection,
) {
  const output: IRedditCommunityContentRanking =
    await api.functional.redditCommunity.platformModerator.analytics.content_trends.analyze(
      connection,
      {
        body: typia.random<IRedditCommunityContentRanking.IRequest>(),
      },
    );
  typia.assert(output);
}
