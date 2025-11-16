import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function test_api_redditCommunity_communities_posts_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPost =
    await api.functional.redditCommunity.communities.posts.at(connection, {
      communityName: typia.random<string>(),
      postId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
