import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";

export async function test_api_redditCommunity_member_posts_votes_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityVote =
    await api.functional.redditCommunity.member.posts.votes.create(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRedditCommunityVote.ICreate>(),
    });
  typia.assert(output);
}
