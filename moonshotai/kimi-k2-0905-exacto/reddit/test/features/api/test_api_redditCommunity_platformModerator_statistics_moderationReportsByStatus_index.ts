import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityContentReportsReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReportsReportStatistics";

export async function test_api_redditCommunity_platformModerator_statistics_moderationReportsByStatus_index(
  connection: api.IConnection,
) {
  const output: IRedditCommunityContentReportsReportStatistics =
    await api.functional.redditCommunity.platformModerator.statistics.moderationReportsByStatus.index(
      connection,
    );
  typia.assert(output);
}
