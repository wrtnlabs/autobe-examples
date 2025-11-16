import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_communityModerator_communities_memberships_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.communityModerator.communities.memberships.erase(
      connection,
      {
        communityName: typia.random<string>(),
        membershipId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
