import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_redditCommunity_platformModerator_communityModerators_erase(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.platformModerator.communityModerators.erase(
      connection,
      {
        communityModeratorNickname: typia.random<string>(),
      },
    );
  typia.assert(output);
}
