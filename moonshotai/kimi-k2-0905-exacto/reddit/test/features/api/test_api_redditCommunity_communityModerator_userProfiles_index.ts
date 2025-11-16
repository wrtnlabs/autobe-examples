import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserProfile";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_redditCommunity_communityModerator_userProfiles_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityUserProfile.ISummary =
    await api.functional.redditCommunity.communityModerator.userProfiles.index(
      connection,
      {
        body: typia.random<IRedditCommunityUserProfile.IRequest>(),
      },
    );
  typia.assert(output);
}
