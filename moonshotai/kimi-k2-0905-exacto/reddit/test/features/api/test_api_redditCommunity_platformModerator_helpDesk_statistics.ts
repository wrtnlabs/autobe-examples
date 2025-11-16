import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityHelpDesk } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityHelpDesk";

export async function test_api_redditCommunity_platformModerator_helpDesk_statistics(
  connection: api.IConnection,
) {
  const output: IRedditCommunityHelpDesk =
    await api.functional.redditCommunity.platformModerator.helpDesk.statistics(
      connection,
    );
  typia.assert(output);
}
