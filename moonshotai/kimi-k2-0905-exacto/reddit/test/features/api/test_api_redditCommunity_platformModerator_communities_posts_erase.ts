import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_platformModerator_communities_posts_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.platformModerator.communities.posts.erase(
      connection,
      {
        communityName: typia.random<string>(),
        postId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
