import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityInvitation";
import { IRedditCommunityCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityInvitation";

export async function test_api_redditCommunity_communityModerator_communities_invitations_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunityInvitation.ISummary =
    await api.functional.redditCommunity.communityModerator.communities.invitations.index(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityCommunityInvitation.IRequest>(),
      },
    );
  typia.assert(output);
}
