import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";

export async function test_api_redditCommunity_member_posts_votes_erase(
  connection: api.IConnection,
) {
  const output: IRedditCommunityVote =
    await api.functional.redditCommunity.member.posts.votes.erase(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      voteId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
