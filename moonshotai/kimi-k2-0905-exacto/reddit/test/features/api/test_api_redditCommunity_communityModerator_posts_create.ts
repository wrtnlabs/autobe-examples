import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function test_api_redditCommunity_communityModerator_posts_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityPost =
    await api.functional.redditCommunity.communityModerator.posts.create(
      connection,
      {
        body: typia.random<IRedditCommunityPost.ICreate>(),
      },
    );
  typia.assert(output);
}
