import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityProfilePreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityProfilePreferences";

export async function test_api_redditCommunity_member_userProfiles_preferences_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityProfilePreferences =
    await api.functional.redditCommunity.member.userProfiles.preferences.at(
      connection,
      {
        profileId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
