import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";

export async function test_api_redditCommunity_communityModerator_votes_erase(
  connection: api.IConnection,
) {
  const output: IRedditCommunityVote =
    await api.functional.redditCommunity.communityModerator.votes.erase(
      connection,
      {
        voteId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
