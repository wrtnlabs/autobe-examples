import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityVote";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";

export async function test_api_redditCommunity_posts_votes_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityVote.ISummary =
    await api.functional.redditCommunity.posts.votes.index(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRedditCommunityVote.IRequest>(),
    });
  typia.assert(output);
}
