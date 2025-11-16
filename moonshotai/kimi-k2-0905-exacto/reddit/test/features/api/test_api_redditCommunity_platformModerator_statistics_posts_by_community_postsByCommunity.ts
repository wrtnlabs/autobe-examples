import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunityPostStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityPostStats";
import { IRedditCommunityCommunityPostStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityPostStats";

export async function test_api_redditCommunity_platformModerator_statistics_posts_by_community_postsByCommunity(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunityPostStats =
    await api.functional.redditCommunity.platformModerator.statistics.posts_by_community.postsByCommunity(
      connection,
      {
        body: typia.random<IRedditCommunityCommunityPostStats.IRequest>(),
      },
    );
  typia.assert(output);
}
