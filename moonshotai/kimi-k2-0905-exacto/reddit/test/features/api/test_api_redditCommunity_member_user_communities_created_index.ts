import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";

export async function test_api_redditCommunity_member_user_communities_created_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.member.user.communities.created.index(
      connection,
    );
  typia.assert(output);
}
