import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

export async function test_api_redditCommunity_member_members_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityMember =
    await api.functional.redditCommunity.member.members.update(connection, {
      memberNickname: typia.random<string>(),
      body: typia.random<IRedditCommunityMember.IUpdate>(),
    });
  typia.assert(output);
}
