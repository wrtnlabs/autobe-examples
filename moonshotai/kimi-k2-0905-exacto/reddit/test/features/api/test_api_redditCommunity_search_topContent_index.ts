import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityContentRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentRanking";

export async function test_api_redditCommunity_search_topContent_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.search.topContent.index(connection, {
      body: typia.random<IRedditCommunityContentRanking.IRequest>(),
    });
  typia.assert(output);
}
