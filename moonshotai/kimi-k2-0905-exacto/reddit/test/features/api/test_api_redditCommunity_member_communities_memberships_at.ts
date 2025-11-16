import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMembership";

export async function test_api_redditCommunity_member_communities_memberships_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityMembership =
    await api.functional.redditCommunity.member.communities.memberships.at(
      connection,
      {
        communityName: typia.random<string>(),
        membershipId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
