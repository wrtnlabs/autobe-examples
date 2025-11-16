import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";

export async function test_api_redditCommunity_member_posts__new_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.member.posts._new.index(connection);
  typia.assert(output);
}
