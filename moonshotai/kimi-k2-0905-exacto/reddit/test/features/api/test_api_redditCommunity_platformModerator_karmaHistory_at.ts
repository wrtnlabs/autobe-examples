import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaHistory";

export async function test_api_redditCommunity_platformModerator_karmaHistory_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKarmaHistory =
    await api.functional.redditCommunity.platformModerator.karmaHistory.at(
      connection,
      {
        karmaHistoryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
