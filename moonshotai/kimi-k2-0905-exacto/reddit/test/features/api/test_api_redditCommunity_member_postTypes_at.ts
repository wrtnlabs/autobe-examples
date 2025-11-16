import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

export async function test_api_redditCommunity_member_postTypes_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPostType =
    await api.functional.redditCommunity.member.postTypes.at(connection, {
      postTypeId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
