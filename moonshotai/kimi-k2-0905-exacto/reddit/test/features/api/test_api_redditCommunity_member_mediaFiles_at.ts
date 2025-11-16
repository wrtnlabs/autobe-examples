import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMediaFile";

export async function test_api_redditCommunity_member_mediaFiles_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityMediaFile =
    await api.functional.redditCommunity.member.mediaFiles.at(connection, {
      mediaFileId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
