import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationQueue";
import { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";

export async function test_api_redditCommunity_communityModerator_communities_moderationQueues_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityModerationQueue.ISummary =
    await api.functional.redditCommunity.communityModerator.communities.moderationQueues.index(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityModerationQueue.IRequest>(),
      },
    );
  typia.assert(output);
}
