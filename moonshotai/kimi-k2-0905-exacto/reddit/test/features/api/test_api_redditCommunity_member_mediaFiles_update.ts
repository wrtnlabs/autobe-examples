import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMediaFile";

export async function test_api_redditCommunity_member_mediaFiles_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityMediaFile =
    await api.functional.redditCommunity.member.mediaFiles.update(connection, {
      mediaFileId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRedditCommunityMediaFile.IUpdate>(),
    });
  typia.assert(output);
}
