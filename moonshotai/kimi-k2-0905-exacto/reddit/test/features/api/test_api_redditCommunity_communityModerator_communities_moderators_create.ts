import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_redditCommunity_communityModerator_communities_moderators_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.communityModerator.communities.moderators.create(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityCommunityModerator.ICreate>(),
      },
    );
  typia.assert(output);
}
