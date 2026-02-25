import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test edge case where search criteria produce no results.
 * An administrator searches with filter criteria that should match zero maintenance schedules
 * to validate graceful handling of empty results. Test combinations like status='completed'
 * with scheduled_start_time far in the future, or search terms that don't match any descriptions.
 * Verify the response contains an empty data array with valid pagination metadata showing 0 records
 * while maintaining proper HTTP status and response structure.
 */
export async function test_api_maintenance_schedule_empty_search_results(
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
  // Test 1: Search with status='completed' and future scheduled_start_time
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year in future
  const search1 =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          status: "completed",
          scheduled_start_time_from: futureDate.toISOString(),
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(search1);
  TestValidator.equals(
    "empty data array for future completed schedules",
    search1.data.length,
    0,
  );
  // Test 2: Search with non-matching search term
  const search2 =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          search:
            "this-search-term-definitely-does-not-exist-in-any-maintenance-schedule",
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(search2);
  TestValidator.equals(
    "empty data array for non-matching search term",
    search2.data.length,
    0,
  );
  // Test 3: Search with impossible combination of filters
  const search3 =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          maintenance_type: "system_update",
          status: "scheduled",
          scheduled_start_time_from: futureDate.toISOString(),
          scheduled_start_time_to: new Date(
            Date.now() - 1000 * 60 * 60 * 24,
          ).toISOString(), // past date
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(search3);
  TestValidator.equals(
    "empty data array for impossible date range",
    search3.data.length,
    0,
  );
  // Test 4: Search with non-existent impact level
  const search4 =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          impact_level: "non-existent-impact-level",
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(search4);
  TestValidator.equals(
    "empty data array for non-existent impact level",
    search4.data.length,
    0,
  );
}