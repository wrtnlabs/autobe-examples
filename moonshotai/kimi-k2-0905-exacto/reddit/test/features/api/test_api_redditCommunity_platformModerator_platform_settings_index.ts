import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPlatformSetting";
import { IRedditCommunityPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformSetting";

export async function test_api_redditCommunity_platformModerator_platform_settings_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityPlatformSetting.ISummary =
    await api.functional.redditCommunity.platformModerator.platform.settings.index(
      connection,
      {
        body: typia.random<IRedditCommunityPlatformSetting.IRequest>(),
      },
    );
  typia.assert(output);
}
