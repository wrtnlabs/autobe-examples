import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityCategory";
import { IRedditCommunityCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategory";

export async function test_api_redditCommunity_platformModerator_communityCategories_search(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunityCategory.ISummary =
    await api.functional.redditCommunity.platformModerator.communityCategories.search(
      connection,
      {
        body: typia.random<IRedditCommunityCommunityCategory.IRequest>(),
      },
    );
  typia.assert(output);
}
