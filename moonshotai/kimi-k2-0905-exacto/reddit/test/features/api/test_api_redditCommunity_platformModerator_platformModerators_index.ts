import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPlatformModerator";
import { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";

export async function test_api_redditCommunity_platformModerator_platformModerators_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityPlatformModerator.ISummary =
    await api.functional.redditCommunity.platformModerator.platformModerators.index(
      connection,
      {
        body: typia.random<IRedditCommunityPlatformModerator.IRequest>(),
      },
    );
  typia.assert(output);
}
