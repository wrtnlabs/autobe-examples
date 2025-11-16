import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityMembership";
import { IRedditCommunityCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMembership";

export async function test_api_redditCommunity_communityModerator_communities_memberships_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunityMembership.ISummary =
    await api.functional.redditCommunity.communityModerator.communities.memberships.index(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityCommunityMembership.IRequest>(),
      },
    );
  typia.assert(output);
}
