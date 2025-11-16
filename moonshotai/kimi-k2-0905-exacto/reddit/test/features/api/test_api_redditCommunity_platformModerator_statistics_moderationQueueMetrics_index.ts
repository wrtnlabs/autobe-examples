import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityModerationQueueMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueueMetrics";

export async function test_api_redditCommunity_platformModerator_statistics_moderationQueueMetrics_index(
  connection: api.IConnection,
) {
  const output: IRedditCommunityModerationQueueMetrics =
    await api.functional.redditCommunity.platformModerator.statistics.moderationQueueMetrics.index(
      connection,
    );
  typia.assert(output);
}
