import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityKarmaCalculation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaCalculation";

export async function test_api_redditCommunity_member_karmaCalculations_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKarmaCalculation =
    await api.functional.redditCommunity.member.karmaCalculations.create(
      connection,
      {
        body: typia.random<IRedditCommunityKarmaCalculation.ICreate>(),
      },
    );
  typia.assert(output);
}
