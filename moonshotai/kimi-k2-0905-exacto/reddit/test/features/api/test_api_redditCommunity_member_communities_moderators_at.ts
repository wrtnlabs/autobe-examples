import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_redditCommunity_member_communities_moderators_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.member.communities.moderators.at(
      connection,
      {
        communityName: typia.random<string>(),
        moderatorId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
