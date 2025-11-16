import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMaintenanceSchedule";
import { IRedditCommunityMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaintenanceSchedule";

export async function test_api_redditCommunity_platformModerator_maintenance_schedules_search(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityMaintenanceSchedule.ISummary =
    await api.functional.redditCommunity.platformModerator.maintenance.schedules.search(
      connection,
      {
        body: typia.random<IRedditCommunityMaintenanceSchedule.IRequest>(),
      },
    );
  typia.assert(output);
}
