import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";

export async function test_api_redditCommunity_platformModerator_system_configurations_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunitySystemConfiguration =
    await api.functional.redditCommunity.platformModerator.system.configurations.update(
      connection,
      {
        configKey: typia.random<string>(),
        body: typia.random<IRedditCommunitySystemConfiguration.IUpdate>(),
      },
    );
  typia.assert(output);
}
