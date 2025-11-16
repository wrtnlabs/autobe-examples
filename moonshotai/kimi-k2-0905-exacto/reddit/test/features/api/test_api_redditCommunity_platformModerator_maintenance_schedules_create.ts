import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaintenanceSchedule";

export async function test_api_redditCommunity_platformModerator_maintenance_schedules_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityMaintenanceSchedule =
    await api.functional.redditCommunity.platformModerator.maintenance.schedules.create(
      connection,
      {
        body: typia.random<IRedditCommunityMaintenanceSchedule.ICreate>(),
      },
    );
  typia.assert(output);
}
