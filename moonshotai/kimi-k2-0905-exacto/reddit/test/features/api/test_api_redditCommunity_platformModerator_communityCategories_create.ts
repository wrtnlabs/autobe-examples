import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategory";

export async function test_api_redditCommunity_platformModerator_communityCategories_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityCategory =
    await api.functional.redditCommunity.platformModerator.communityCategories.create(
      connection,
      {
        body: typia.random<IRedditCommunityCommunityCategory.ICreate>(),
      },
    );
  typia.assert(output);
}
