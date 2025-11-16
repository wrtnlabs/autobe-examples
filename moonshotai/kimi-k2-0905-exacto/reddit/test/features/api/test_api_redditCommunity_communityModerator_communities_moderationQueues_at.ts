import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";

export async function test_api_redditCommunity_communityModerator_communities_moderationQueues_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityModerationQueue =
    await api.functional.redditCommunity.communityModerator.communities.moderationQueues.at(
      connection,
      {
        communityName: typia.random<string>(),
        queueId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
