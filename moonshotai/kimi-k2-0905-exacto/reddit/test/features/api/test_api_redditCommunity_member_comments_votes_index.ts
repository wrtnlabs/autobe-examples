import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPageIRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityVote";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";

export async function test_api_redditCommunity_member_comments_votes_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityVote.ISummary =
    await api.functional.redditCommunity.member.comments.votes.index(
      connection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityVote.IRequest>(),
      },
    );
  typia.assert(output);
}
