import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";

export async function test_api_redditCommunity_member_comments_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityComment =
    await api.functional.redditCommunity.member.comments.update(connection, {
      commentId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRedditCommunityComment.IUpdate>(),
    });
  typia.assert(output);
}
