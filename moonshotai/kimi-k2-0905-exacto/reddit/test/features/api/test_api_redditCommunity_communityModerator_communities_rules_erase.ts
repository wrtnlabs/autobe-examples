import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_communityModerator_communities_rules_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.communityModerator.communities.rules.erase(
      connection,
      {
        communityName: typia.random<string>(),
        ruleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
