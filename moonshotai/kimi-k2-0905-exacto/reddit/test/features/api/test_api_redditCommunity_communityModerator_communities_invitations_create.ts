import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityInvitation";

export async function test_api_redditCommunity_communityModerator_communities_invitations_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityInvitation =
    await api.functional.redditCommunity.communityModerator.communities.invitations.create(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityCommunityInvitation.ICreate>(),
      },
    );
  typia.assert(output);
}
