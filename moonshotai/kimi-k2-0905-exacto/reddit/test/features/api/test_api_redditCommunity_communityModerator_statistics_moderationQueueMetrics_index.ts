import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityModerationQueueMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueueMetrics";

export async function test_api_redditCommunity_communityModerator_statistics_moderationQueueMetrics_index(
  connection: api.IConnection,
) {
  const output: IRedditCommunityModerationQueueMetrics =
    await api.functional.redditCommunity.communityModerator.statistics.moderationQueueMetrics.index(
      connection,
    );
  typia.assert(output);
}
