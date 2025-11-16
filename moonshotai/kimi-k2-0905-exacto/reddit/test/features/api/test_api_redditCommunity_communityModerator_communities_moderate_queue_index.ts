import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityModerationQueueItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationQueueItem";
import { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";

export async function test_api_redditCommunity_communityModerator_communities_moderate_queue_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityModerationQueueItem.ISummary =
    await api.functional.redditCommunity.communityModerator.communities.moderate.queue.index(
      connection,
      {
        body: typia.random<IRedditCommunityModerationQueue.IRequest>(),
      },
    );
  typia.assert(output);
}
