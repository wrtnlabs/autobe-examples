import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunitySupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySupportTicket";

export async function test_api_redditCommunity_communityModerator_supportTickets_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunitySupportTicket =
    await api.functional.redditCommunity.communityModerator.supportTickets.update(
      connection,
      {
        supportTicketId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunitySupportTicket.IUpdate>(),
      },
    );
  typia.assert(output);
}
