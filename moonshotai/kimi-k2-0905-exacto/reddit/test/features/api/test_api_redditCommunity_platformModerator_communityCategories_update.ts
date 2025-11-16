import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategory";

export async function test_api_redditCommunity_platformModerator_communityCategories_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityCategory =
    await api.functional.redditCommunity.platformModerator.communityCategories.update(
      connection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityCommunityCategory.IUpdate>(),
      },
    );
  typia.assert(output);
}
