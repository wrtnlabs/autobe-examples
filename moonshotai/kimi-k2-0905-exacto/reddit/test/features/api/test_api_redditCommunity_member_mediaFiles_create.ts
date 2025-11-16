import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMediaFile";

export async function test_api_redditCommunity_member_mediaFiles_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityMediaFile =
    await api.functional.redditCommunity.member.mediaFiles.create(connection, {
      body: typia.random<IRedditCommunityMediaFile.ICreate>(),
    });
  typia.assert(output);
}
