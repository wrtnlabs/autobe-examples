import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaintenanceSchedule";

export async function test_api_redditCommunity_platformModerator_maintenance_schedules_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityMaintenanceSchedule =
    await api.functional.redditCommunity.platformModerator.maintenance.schedules.at(
      connection,
      {
        scheduleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
