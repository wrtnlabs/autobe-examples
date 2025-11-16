import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMembership";

export async function test_api_redditCommunity_platformModerator_communities_memberships_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityMembership =
    await api.functional.redditCommunity.platformModerator.communities.memberships.update(
      connection,
      {
        communityName: typia.random<string>(),
        membershipId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityCommunityMembership.IUpdate>(),
      },
    );
  typia.assert(output);
}
