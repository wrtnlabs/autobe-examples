import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";

export async function test_api_redditCommunity_member_communities_recommendations(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.recommendations(
      connection,
    );
  typia.assert(output);
}
