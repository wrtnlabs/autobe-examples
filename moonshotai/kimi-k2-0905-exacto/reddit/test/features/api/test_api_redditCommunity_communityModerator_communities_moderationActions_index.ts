import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

export async function test_api_redditCommunity_communityModerator_communities_moderationActions_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityModerationAction =
    await api.functional.redditCommunity.communityModerator.communities.moderationActions.index(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityModerationAction.IRequest>(),
      },
    );
  typia.assert(output);
}
