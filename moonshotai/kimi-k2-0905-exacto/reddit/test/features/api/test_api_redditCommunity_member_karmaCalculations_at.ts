import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityKarmaCalculation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaCalculation";

export async function test_api_redditCommunity_member_karmaCalculations_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKarmaCalculation =
    await api.functional.redditCommunity.member.karmaCalculations.at(
      connection,
      {
        karmaCalculationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
