import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_platformModerator_contentRankings_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.platformModerator.contentRankings.erase(
      connection,
      {
        contentRankingId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
