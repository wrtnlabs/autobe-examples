import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_maintenance_schedules_search_by_type_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test search functionality with specific type and status combination
  const targetType = "system update";
  const targetStatus = "scheduled";
  const searchResult =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          maintenance_type: targetType,
          status: targetStatus,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate that all returned schedules match the search criteria (if any exist)
  for (const schedule of searchResult.data) {
    TestValidator.equals(
      "maintenance type matches",
      schedule.maintenance_type,
      targetType,
    );
    TestValidator.equals("status matches", schedule.status, targetStatus);
    // Validate schedule structure
    TestValidator.predicate(
      "has valid scheduled start time",
      typeof schedule.scheduled_start_time === "string",
    );
    TestValidator.predicate(
      "has valid scheduled end time",
      typeof schedule.scheduled_end_time === "string",
    );
    TestValidator.predicate(
      "has valid impact level",
      ["low", "medium", "high", "critical"].includes(schedule.impact_level),
    );
    // Validate administrator details
    TestValidator.predicate(
      "has scheduledByAdmin",
      typeof schedule.scheduledByAdmin === "object",
    );
    TestValidator.predicate(
      "admin has id",
      typeof schedule.scheduledByAdmin.id === "string",
    );
    TestValidator.predicate(
      "admin has email",
      typeof schedule.scheduledByAdmin.email === "string",
    );
    TestValidator.predicate(
      "admin has display_name",
      typeof schedule.scheduledByAdmin.display_name === "string",
    );
    TestValidator.predicate(
      "admin has created_at",
      typeof schedule.scheduledByAdmin.created_at === "string",
    );
  }
  // Test with different pagination parameters
  const paginatedSearch =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          maintenance_type: targetType,
          status: targetStatus,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination limit matches",
    paginatedSearch.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length respects limit",
    paginatedSearch.data.length <= 5,
  );
  // Test search without filters to get all schedules
  const allSchedules =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(allSchedules);
  // Verify that filtered search returns subset of all schedules
  if (searchResult.pagination.records > 0) {
    TestValidator.predicate(
      "filtered search returns fewer or equal records",
      searchResult.pagination.records <= allSchedules.pagination.records,
    );
  }
}
