import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityKarmaHistory";
import { IRedditCommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaHistory";

export async function test_api_redditCommunity_platformModerator_karmaHistory_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityKarmaHistory.ISummary =
    await api.functional.redditCommunity.platformModerator.karmaHistory.index(
      connection,
      {
        body: typia.random<IRedditCommunityKarmaHistory.IRequest>(),
      },
    );
  typia.assert(output);
}
