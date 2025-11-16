import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_member_comments_votes_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.member.comments.votes.erase(
      connection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        voteId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
