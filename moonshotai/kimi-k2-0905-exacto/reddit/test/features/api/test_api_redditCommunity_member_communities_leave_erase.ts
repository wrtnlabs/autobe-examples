import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

export async function test_api_redditCommunity_member_communities_leave_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.member.communities.leave.erase(
      connection,
      {
        communityName: typia.random<string>(),
      },
    );
  typia.assert(output);
}
