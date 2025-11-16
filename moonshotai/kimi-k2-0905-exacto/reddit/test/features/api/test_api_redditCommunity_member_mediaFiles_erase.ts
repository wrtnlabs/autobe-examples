import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_member_mediaFiles_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.redditCommunity.member.mediaFiles.erase(
    connection,
    {
      mediaFileId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
