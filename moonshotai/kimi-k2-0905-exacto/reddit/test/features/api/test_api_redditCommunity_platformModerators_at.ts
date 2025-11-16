import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";

export async function test_api_redditCommunity_platformModerators_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPlatformModerator =
    await api.functional.redditCommunity.platformModerators.at(connection, {
      platformModeratorNickname: typia.random<string>(),
    });
  typia.assert(output);
}
