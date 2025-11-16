import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityProfilePreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityProfilePreference";

export async function test_api_redditCommunity_member_userProfiles_preferences_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityProfilePreference =
    await api.functional.redditCommunity.member.userProfiles.preferences.update(
      connection,
      {
        profileId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityProfilePreference.IUpdate>(),
      },
    );
  typia.assert(output);
}
