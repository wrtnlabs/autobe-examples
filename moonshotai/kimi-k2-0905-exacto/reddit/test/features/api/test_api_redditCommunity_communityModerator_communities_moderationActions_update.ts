import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

export async function test_api_redditCommunity_communityModerator_communities_moderationActions_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityModerationAction =
    await api.functional.redditCommunity.communityModerator.communities.moderationActions.update(
      connection,
      {
        communityName: typia.random<string>(),
        actionId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityModerationAction.IUpdate>(),
      },
    );
  typia.assert(output);
}
