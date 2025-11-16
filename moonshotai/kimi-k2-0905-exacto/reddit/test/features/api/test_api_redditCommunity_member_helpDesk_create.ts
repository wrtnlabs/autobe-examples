import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunitySupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySupportTicket";

export async function test_api_redditCommunity_member_helpDesk_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunitySupportTicket =
    await api.functional.redditCommunity.member.helpDesk.create(connection, {
      body: typia.random<IRedditCommunitySupportTicket.ICreate>(),
    });
  typia.assert(output);
}
