import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_redditCommunity_member_userProfiles_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityUserProfile =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: typia.random<IRedditCommunityUserProfile.ICreate>(),
      },
    );
  typia.assert(output);
}
