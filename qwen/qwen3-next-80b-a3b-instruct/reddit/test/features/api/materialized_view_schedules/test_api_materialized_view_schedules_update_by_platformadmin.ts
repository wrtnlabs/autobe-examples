import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMaterializedViewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaterializedViewSchedule";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_materialized_view_schedules_update_by_platformadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Define two valid materialized view names as specified in the scenario
  const viewNames = ["mv_post_karma_scores", "mv_community_subscriber_counts"];
  // 2. Create request body with valid status 'running' and view_names array
  const requestBody: api.functional.redditCommunity.materialized_view_schedules.index.Body =
    {
      view_names: viewNames,
      status: "running" as const,
    };
  // 3. Create platform admin connection (connection isolation pattern)
  const adminConnection: api.IConnection = { host: connection.host };
  // 4. Execute the PATCH request to update materialized view schedules
  const updatedSchedule: api.functional.redditCommunity.materialized_view_schedules.index.Response =
    await api.functional.redditCommunity.materialized_view_schedules.index(
      adminConnection,
      { body: requestBody },
    );
  // 5. Validate response structure using typia.assert (complete validation)
  typia.assert(updatedSchedule);
  // 6. Verify view_name is one of the requested views
  TestValidator.predicate(
    "view_name matches requested",
    viewNames.includes(updatedSchedule.view_name),
  );
  // 7. Verify status is now 'running' as requested
  TestValidator.equals(
    "status updated to running",
    updatedSchedule.status,
    "running",
  );
  // 8. Verify refresh_interval is a valid int32 (type validation is already done by typia.assert)
  // This is just business logic check
  TestValidator.predicate(
    "refresh_interval is positive",
    updatedSchedule.refresh_interval > 0,
  );
}
