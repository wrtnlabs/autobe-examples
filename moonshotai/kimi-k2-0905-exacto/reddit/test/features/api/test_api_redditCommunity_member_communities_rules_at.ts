import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

export async function test_api_redditCommunity_member_communities_rules_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.member.communities.rules.at(
      connection,
      {
        communityName: typia.random<string>(),
        ruleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
