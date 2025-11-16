import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityVote";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";

export async function test_api_redditCommunity_member_votes_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityVote.ISummary =
    await api.functional.redditCommunity.member.votes.index(connection, {
      body: typia.random<IRedditCommunityVote.IRequest>(),
    });
  typia.assert(output);
}
