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

/**
 * Test searching maintenance schedules within specific date ranges.
 * This test focuses on validating the date range filtering functionality
 * of the maintenance schedules search endpoint. Since schedule creation
 * is not available in the API, we test the filtering logic using the
 * search capabilities provided.
 */
export async function test_api_maintenance_schedules_date_range_filtering(
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
  // Test 1: Search with specific date range
  const searchFrom = new Date("2024-01-01T00:00:00Z").toISOString();
  const searchTo = new Date("2024-12-31T23:59:59Z").toISOString();
  const dateRangeResponse =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          scheduled_start_time_from: searchFrom,
          scheduled_start_time_to: searchTo,
          limit: 10,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Validate response structure
  TestValidator.equals(
    "pagination limit matches",
    dateRangeResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    dateRangeResponse.pagination.records >= 0,
  );
  // Test 2: Search with only from date (open-ended range)
  const fromOnlyResponse =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          scheduled_start_time_from: searchFrom,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(fromOnlyResponse);
  // Test 3: Search with only to date (upper-bound only)
  const toOnlyResponse =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          scheduled_start_time_to: searchTo,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(toOnlyResponse);
  // Test 4: Search with exact date match (boundary testing)
  const exactDateResponse =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          scheduled_start_time_from: searchFrom,
          scheduled_start_time_to: searchFrom,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(exactDateResponse);
  // Test 5: Pagination with date filtering
  const paginatedResponse =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          scheduled_start_time_from: searchFrom,
          scheduled_start_time_to: searchTo,
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination current page matches",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    paginatedResponse.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginatedResponse.pagination.pages >= 0,
  );
  // Test 6: Combined filtering with date range and other criteria
  const combinedResponse =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          scheduled_start_time_from: searchFrom,
          scheduled_start_time_to: searchTo,
          maintenance_type: "system_update",
          status: "scheduled",
          impact_level: "medium",
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(combinedResponse);
}
