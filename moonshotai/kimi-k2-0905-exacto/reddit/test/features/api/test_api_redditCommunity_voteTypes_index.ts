import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityVoteType";
import { IRedditCommunityVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVoteType";

export async function test_api_redditCommunity_voteTypes_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityVoteType.ISummary =
    await api.functional.redditCommunity.voteTypes.index(connection, {
      body: typia.random<IRedditCommunityVoteType.IRequest>(),
    });
  typia.assert(output);
}
