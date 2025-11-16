import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityInvitation";

export async function test_api_redditCommunity_communityModerator_communities_invitations_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityInvitation =
    await api.functional.redditCommunity.communityModerator.communities.invitations.at(
      connection,
      {
        communityName: typia.random<string>(),
        invitationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
