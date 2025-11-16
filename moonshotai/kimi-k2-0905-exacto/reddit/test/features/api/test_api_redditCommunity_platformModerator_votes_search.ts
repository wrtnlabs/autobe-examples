import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityVote";
import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";

export async function test_api_redditCommunity_platformModerator_votes_search(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityVote.ISummary =
    await api.functional.redditCommunity.platformModerator.votes.search(
      connection,
      {
        body: typia.random<IRedditCommunityVote.IRequest>(),
      },
    );
  typia.assert(output);
}
