import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformSetting";

export async function test_api_redditCommunity_platformModerator_platform_settings_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPlatformSetting =
    await api.functional.redditCommunity.platformModerator.platform.settings.update(
      connection,
      {
        settingKey: typia.random<string>(),
        body: typia.random<IRedditCommunityPlatformSetting.IUpdate>(),
      },
    );
  typia.assert(output);
}
