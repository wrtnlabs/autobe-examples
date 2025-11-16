import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityKarmaCalculationsBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaCalculationsBreakdown";
import { IRedditCommunityKarmaCalculationsBreakdownRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaCalculationsBreakdownRequest";

export async function test_api_redditCommunity_member_analytics_karmaBreakdown_index(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKarmaCalculationsBreakdown =
    await api.functional.redditCommunity.member.analytics.karmaBreakdown.index(
      connection,
      {
        body: typia.random<IRedditCommunityKarmaCalculationsBreakdownRequest>(),
      },
    );
  typia.assert(output);
}
