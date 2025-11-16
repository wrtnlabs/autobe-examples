import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";

export async function test_api_redditCommunity_platformModerator_platformModerators_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPlatformModerator =
    await api.functional.redditCommunity.platformModerator.platformModerators.update(
      connection,
      {
        platformModeratorNickname: typia.random<string>(),
        body: typia.random<IRedditCommunityPlatformModerator.IUpdate>(),
      },
    );
  typia.assert(output);
}
