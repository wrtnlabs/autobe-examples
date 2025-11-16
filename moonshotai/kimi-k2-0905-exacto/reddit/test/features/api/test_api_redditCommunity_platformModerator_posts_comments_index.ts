import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";

export async function test_api_redditCommunity_platformModerator_posts_comments_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.platformModerator.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityComment.IRequest>(),
      },
    );
  typia.assert(output);
}
