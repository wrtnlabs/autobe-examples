import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";

export async function test_api_redditCommunity_member_comments_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityComment =
    await api.functional.redditCommunity.member.comments.create(connection, {
      body: typia.random<IRedditCommunityComment.ICreate>(),
    });
  typia.assert(output);
}
