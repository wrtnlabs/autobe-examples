import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformSetting";

export async function test_api_redditCommunity_platform_settings_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPlatformSetting =
    await api.functional.redditCommunity.platform.settings.at(connection, {
      settingKey: typia.random<string>(),
    });
  typia.assert(output);
}
