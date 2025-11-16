import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function test_api_redditCommunity_posts_top_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.top.index(connection, {
      body: typia.random<IRedditCommunityPost.IRequest>(),
    });
  typia.assert(output);
}
