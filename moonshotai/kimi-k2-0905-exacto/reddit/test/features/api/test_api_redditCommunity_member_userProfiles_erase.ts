import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_member_userProfiles_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.redditCommunity.member.userProfiles.erase(
    connection,
    {
      profileId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
