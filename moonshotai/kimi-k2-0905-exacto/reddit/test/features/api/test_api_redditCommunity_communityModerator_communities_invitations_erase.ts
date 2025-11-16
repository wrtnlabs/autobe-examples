import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_communityModerator_communities_invitations_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.communityModerator.communities.invitations.erase(
      connection,
      {
        communityName: typia.random<string>(),
        invitationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
