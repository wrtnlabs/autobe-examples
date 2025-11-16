import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunitySupportTicketsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySupportTicketsSummary";

export async function test_api_redditCommunity_platformModerator_reports_supportTicketsSummary(
  connection: api.IConnection,
) {
  const output: IRedditCommunitySupportTicketsSummary =
    await api.functional.redditCommunity.platformModerator.reports.supportTicketsSummary(
      connection,
    );
  typia.assert(output);
}
