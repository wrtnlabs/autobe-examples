import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

export async function test_api_redditCommunity_platformModerator_members_erase(
  connection: api.IConnection,
) {
  const output: IRedditCommunityMember =
    await api.functional.redditCommunity.platformModerator.members.erase(
      connection,
      {
        memberNickname: typia.random<string>(),
      },
    );
  typia.assert(output);
}
