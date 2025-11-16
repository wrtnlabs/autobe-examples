import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";

export async function test_api_redditCommunity_communityModerator_communities_moderators_eraseByCommunitynameAndModeratorid(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPlatformModerator =
    await api.functional.redditCommunity.communityModerator.communities.moderators.eraseByCommunitynameAndModeratorid(
      connection,
      {
        communityName: typia.random<string>(),
        moderatorId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
