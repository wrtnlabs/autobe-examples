import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

export async function test_api_redditCommunity_platformModerator_communities_moderationActions_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityModerationAction =
    await api.functional.redditCommunity.platformModerator.communities.moderationActions.at(
      connection,
      {
        communityName: typia.random<string>(),
        actionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
