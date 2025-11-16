import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemConfiguration";
import { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";

export async function test_api_redditCommunity_platformModerator_system_configurations_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunitySystemConfiguration.ISummary =
    await api.functional.redditCommunity.platformModerator.system.configurations.index(
      connection,
      {
        body: typia.random<IRedditCommunitySystemConfiguration.IRequest>(),
      },
    );
  typia.assert(output);
}
