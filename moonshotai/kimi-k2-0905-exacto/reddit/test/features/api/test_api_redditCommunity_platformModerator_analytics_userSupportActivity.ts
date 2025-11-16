import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunitySupportTicketAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySupportTicketAnalytics";
import { IRedditCommunitySupportTicketAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySupportTicketAnalytics";

export async function test_api_redditCommunity_platformModerator_analytics_userSupportActivity(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunitySupportTicketAnalytics =
    await api.functional.redditCommunity.platformModerator.analytics.userSupportActivity(
      connection,
      {
        body: typia.random<IRedditCommunitySupportTicketAnalytics.IRequest>(),
      },
    );
  typia.assert(output);
}
