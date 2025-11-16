import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

export async function test_api_redditCommunity_communities_search(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.search(connection, {
      body: typia.random<IRedditCommunityCommunity.IRequest>(),
    });
  typia.assert(output);
}
