import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_redditCommunity_platformModerator_userProfiles_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityUserProfile =
    await api.functional.redditCommunity.platformModerator.userProfiles.at(
      connection,
      {
        profileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
