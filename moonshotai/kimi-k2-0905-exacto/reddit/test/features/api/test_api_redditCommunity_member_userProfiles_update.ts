import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_redditCommunity_member_userProfiles_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityUserProfile =
    await api.functional.redditCommunity.member.userProfiles.update(
      connection,
      {
        profileId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityUserProfile.IUpdate>(),
      },
    );
  typia.assert(output);
}
