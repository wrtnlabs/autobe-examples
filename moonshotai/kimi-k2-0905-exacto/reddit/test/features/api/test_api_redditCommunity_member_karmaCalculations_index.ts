import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityKarmaCalculation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityKarmaCalculation";
import { IRedditCommunityKarmaCalculation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaCalculation";

export async function test_api_redditCommunity_member_karmaCalculations_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityKarmaCalculation.ISummary =
    await api.functional.redditCommunity.member.karmaCalculations.index(
      connection,
      {
        body: typia.random<IRedditCommunityKarmaCalculation.IRequest>(),
      },
    );
  typia.assert(output);
}
