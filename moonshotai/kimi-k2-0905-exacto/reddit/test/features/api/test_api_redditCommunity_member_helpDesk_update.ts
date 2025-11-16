import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunitySupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySupportTicket";

export async function test_api_redditCommunity_member_helpDesk_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunitySupportTicket =
    await api.functional.redditCommunity.member.helpDesk.update(connection, {
      helpDeskId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRedditCommunitySupportTicket.IUpdate>(),
    });
  typia.assert(output);
}
