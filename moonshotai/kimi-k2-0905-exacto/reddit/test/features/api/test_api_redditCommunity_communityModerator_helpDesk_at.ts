import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunitySupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySupportTicket";

export async function test_api_redditCommunity_communityModerator_helpDesk_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunitySupportTicket =
    await api.functional.redditCommunity.communityModerator.helpDesk.at(
      connection,
      {
        helpDeskId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
