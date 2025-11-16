import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMediaFile";
import { IRedditCommunityMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMediaFile";

export async function test_api_redditCommunity_member_mediaFiles_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityMediaFile.ISummary =
    await api.functional.redditCommunity.member.mediaFiles.index(connection, {
      body: typia.random<IRedditCommunityMediaFile.IRequest>(),
    });
  typia.assert(output);
}
