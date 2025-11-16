import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerator";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_redditCommunity_communityModerator_communities_moderators_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.communityModerator.communities.moderators.index(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityCommunityModerator.IRequest>(),
      },
    );
  typia.assert(output);
}
