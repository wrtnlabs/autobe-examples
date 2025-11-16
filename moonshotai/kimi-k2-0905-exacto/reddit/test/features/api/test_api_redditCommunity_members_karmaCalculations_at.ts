import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityKarmaCalculations } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaCalculations";

export async function test_api_redditCommunity_members_karmaCalculations_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKarmaCalculations =
    await api.functional.redditCommunity.members.karmaCalculations.at(
      connection,
      {
        memberNickname: typia.random<string>(),
      },
    );
  typia.assert(output);
}
