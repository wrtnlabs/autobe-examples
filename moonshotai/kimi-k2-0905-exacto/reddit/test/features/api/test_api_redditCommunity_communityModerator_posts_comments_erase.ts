import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";

export async function test_api_redditCommunity_communityModerator_posts_comments_erase(
  connection: api.IConnection,
) {
  const output: IRedditCommunityComment =
    await api.functional.redditCommunity.communityModerator.posts.comments.erase(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
