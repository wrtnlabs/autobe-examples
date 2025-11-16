import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";

export async function test_api_redditCommunity_communities_posts_hot_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.communities.posts.hot.index(
      connection,
      {
        communityName: typia.random<string>(),
      },
    );
  typia.assert(output);
}
