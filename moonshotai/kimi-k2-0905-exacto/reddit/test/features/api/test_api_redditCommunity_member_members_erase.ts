import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

export async function test_api_redditCommunity_member_members_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.redditCommunity.member.members.erase(
    connection,
    {
      memberNickname: typia.random<string>(),
    },
  );
  typia.assert(output);
}
