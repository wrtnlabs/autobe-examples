import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_redditCommunity_members_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityUserProfile =
    await api.functional.redditCommunity.members.at(connection, {
      memberNickname: typia.random<string>(),
    });
  typia.assert(output);
}
