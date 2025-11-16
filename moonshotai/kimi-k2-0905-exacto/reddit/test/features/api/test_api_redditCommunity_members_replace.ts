import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_redditCommunity_members_replace(
  connection: api.IConnection,
) {
  const output: IRedditCommunityUserProfile =
    await api.functional.redditCommunity.members.replace(connection, {
      memberNickname: typia.random<string>(),
      body: typia.random<IRedditCommunityUserProfile.IUpdate>(),
    });
  typia.assert(output);
}
