import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunitySupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySupportTicket";
import { IRedditCommunitySupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySupportTicket";

export async function test_api_redditCommunity_platformModerator_helpDesk_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunitySupportTicket.ISummary =
    await api.functional.redditCommunity.platformModerator.helpDesk.index(
      connection,
      {
        body: typia.random<IRedditCommunitySupportTicket.IRequest>(),
      },
    );
  typia.assert(output);
}
