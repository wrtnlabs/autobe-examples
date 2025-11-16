import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";

export async function test_api_redditCommunity_visitor_comments_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.visitor.comments.index(connection, {
      body: typia.random<IRedditCommunityComment.IRequest>(),
    });
  typia.assert(output);
}
