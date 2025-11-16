import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunityVotingTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityVotingTrends";
import { IRedditCommunityCommunityVotingTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityVotingTrends";

export async function test_api_redditCommunity_platformModerator_statistics_votingTrends_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunityVotingTrends =
    await api.functional.redditCommunity.platformModerator.statistics.votingTrends.index(
      connection,
      {
        body: typia.random<IRedditCommunityCommunityVotingTrends.IRequest>(),
      },
    );
  typia.assert(output);
}
