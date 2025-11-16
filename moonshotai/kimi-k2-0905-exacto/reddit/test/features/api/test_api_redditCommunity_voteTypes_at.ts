import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVoteType";

export async function test_api_redditCommunity_voteTypes_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityVoteType =
    await api.functional.redditCommunity.voteTypes.at(connection, {
      voteTypeId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
