import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_member_appeals_at(
  connection: api.IConnection,
) {
  const output = await api.functional.redditCommunity.member.appeals.at(
    connection,
    {
      appealId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
