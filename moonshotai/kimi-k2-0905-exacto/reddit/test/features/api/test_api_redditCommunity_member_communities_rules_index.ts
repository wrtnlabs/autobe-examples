import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityRule";
import { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

export async function test_api_redditCommunity_member_communities_rules_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunityRule =
    await api.functional.redditCommunity.member.communities.rules.index(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityCommunityRule.IRequest>(),
      },
    );
  typia.assert(output);
}
