import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityUserAchievements } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAchievements";

export async function test_api_redditCommunity_userProfiles_achievements_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityUserAchievements =
    await api.functional.redditCommunity.userProfiles.achievements.at(
      connection,
      {
        profileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
