import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMaintenanceSchedule";
import { IRedditCommunityMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaintenanceSchedule";

export async function test_api_redditCommunity_platformModerator_reports_maintenance_history_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityMaintenanceSchedule =
    await api.functional.redditCommunity.platformModerator.reports.maintenance_history.index(
      connection,
      {
        body: typia.random<IRedditCommunityMaintenanceSchedule.IRequest>(),
      },
    );
  typia.assert(output);
}
