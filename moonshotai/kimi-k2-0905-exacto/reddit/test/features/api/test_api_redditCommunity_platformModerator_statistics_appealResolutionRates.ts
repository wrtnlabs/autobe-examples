import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityAppealResolutionStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppealResolutionStatistics";

export async function test_api_redditCommunity_platformModerator_statistics_appealResolutionRates(
  connection: api.IConnection,
) {
  const output: IRedditCommunityAppealResolutionStatistics =
    await api.functional.redditCommunity.platformModerator.statistics.appealResolutionRates(
      connection,
    );
  typia.assert(output);
}
