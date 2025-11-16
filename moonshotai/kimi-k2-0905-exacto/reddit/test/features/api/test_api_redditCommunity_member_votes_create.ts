import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";

export async function test_api_redditCommunity_member_votes_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityVote =
    await api.functional.redditCommunity.member.votes.create(connection, {
      body: typia.random<IRedditCommunityVote.ICreate>(),
    });
  typia.assert(output);
}
