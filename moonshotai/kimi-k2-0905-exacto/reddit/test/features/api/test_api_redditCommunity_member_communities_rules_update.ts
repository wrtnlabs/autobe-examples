import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

export async function test_api_redditCommunity_member_communities_rules_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.member.communities.rules.update(
      connection,
      {
        communityName: typia.random<string & tags.Pattern<"^[a-z0-9_]+">>(),
        ruleId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityCommunityRule.IUpdate>(),
      },
    );
  typia.assert(output);
}
