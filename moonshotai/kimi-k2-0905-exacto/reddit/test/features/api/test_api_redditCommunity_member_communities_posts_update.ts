import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function test_api_redditCommunity_member_communities_posts_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPost =
    await api.functional.redditCommunity.member.communities.posts.update(
      connection,
      {
        communityName: typia.random<string>(),
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityPost.IUpdate>(),
      },
    );
  typia.assert(output);
}
