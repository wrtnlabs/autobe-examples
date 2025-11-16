import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function test_api_redditCommunity_platformModerator_posts_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPost =
    await api.functional.redditCommunity.platformModerator.posts.update(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityPost.IUpdate>(),
      },
    );
  typia.assert(output);
}
