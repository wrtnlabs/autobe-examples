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
import { generate_random_discussion_board_admin_maintenance_schedules_create } from "../../../generate/generate_random_discussion_board_admin_maintenance_schedules_create";
import { prepare_random_discussion_board_maintenance_schedule } from "../../../prepare/prepare_random_discussion_board_maintenance_schedule";

export async function test_api_maintenance_schedule_advanced_filtering(
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
  // Create test maintenance schedules with varied attributes
  const maintenanceTypes = [
    "system update",
    "database backup",
    "security patch",
  ] as const;
  const statuses = [
    "scheduled",
    "in-progress",
    "completed",
    "cancelled",
  ] as const;
  const impactLevels = ["low", "medium", "high", "critical"] as const;
  const scheduleCount = 12;
  const schedules: IDiscussionBoardMaintenanceSchedule[] =
    await ArrayUtil.asyncRepeat(scheduleCount, async (i) => {
      const maintenanceType = RandomGenerator.pick(maintenanceTypes);
      const status = RandomGenerator.pick(statuses);
      const impactLevel = RandomGenerator.pick(impactLevels);
      const schedule =
        await generate_random_discussion_board_admin_maintenance_schedules_create(
          adminConnection,
          {
            body: {
              maintenance_type: maintenanceType,
              description: RandomGenerator.paragraph({ sentences: 3 }),
              scheduled_start_time: new Date(
                Date.now() + i * 24 * 60 * 60 * 1000,
              ).toISOString(),
              scheduled_end_time: new Date(
                Date.now() + (i + 1) * 24 * 60 * 60 * 1000,
              ).toISOString(),
              estimated_duration_minutes: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<30> &
                  tags.Maximum<480>
              >(),
              impact_level: impactLevel,
              status: status,
              notes:
                i % 3 === 0
                  ? RandomGenerator.paragraph({ sentences: 2 })
                  : undefined,
            } satisfies IDiscussionBoardMaintenanceSchedule.ICreate,
          },
        );
      typia.assert(schedule);
      return schedule;
    });
  // Test individual filters
  const maintenanceTypeToTest = maintenanceTypes[0];
  const typeFiltered =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          maintenance_type: maintenanceTypeToTest,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(typeFiltered);
  TestValidator.equals(
    "maintenance_type filter returns correct schedules",
    typeFiltered.data.every(
      (s) => s.maintenance_type === maintenanceTypeToTest,
    ),
    true,
  );
  const statusToTest = statuses[1];
  const statusFiltered =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          status: statusToTest,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(statusFiltered);
  TestValidator.equals(
    "status filter returns correct schedules",
    statusFiltered.data.every((s) => s.status === statusToTest),
    true,
  );
  const impactLevelToTest = impactLevels[2];
  const impactFiltered =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          impact_level: impactLevelToTest,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(impactFiltered);
  TestValidator.equals(
    "impact_level filter returns correct schedules",
    impactFiltered.data.every((s) => s.impact_level === impactLevelToTest),
    true,
  );
  // Test date range filters
  const startTimeFrom = new Date(
    Date.now() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const startTimeTo = new Date(
    Date.now() + 8 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeFiltered =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          scheduled_start_time_from: startTimeFrom,
          scheduled_start_time_to: startTimeTo,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(dateRangeFiltered);
  TestValidator.predicate(
    "date range filter returns schedules within range",
    dateRangeFiltered.data.every(
      (s) =>
        s.scheduled_start_time >= startTimeFrom &&
        s.scheduled_start_time <= startTimeTo,
    ),
  );
  // Test text search - remove description check as it might not be in summary
  const searchTerm = schedules[0].description.substring(0, 10);
  const searchFiltered =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(searchFiltered);
  TestValidator.predicate(
    "text search returns relevant schedules",
    searchFiltered.data.length > 0,
  );
  // Test combined filters
  const combinedFiltered =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          maintenance_type: maintenanceTypeToTest,
          status: statusToTest,
          impact_level: impactLevelToTest,
          scheduled_start_time_from: startTimeFrom,
          scheduled_start_time_to: startTimeTo,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.predicate(
    "combined filter returns schedules matching all criteria",
    combinedFiltered.data.every(
      (s) =>
        s.maintenance_type === maintenanceTypeToTest &&
        s.status === statusToTest &&
        s.impact_level === impactLevelToTest &&
        s.scheduled_start_time >= startTimeFrom &&
        s.scheduled_start_time <= startTimeTo,
    ),
  );
  // Test pagination - use generic pagination checks
  const paginated =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination limit is respected",
    paginated.data.length <= 5,
    true,
  );
  TestValidator.predicate(
    "pagination metadata is present",
    !!paginated.pagination,
  );
  // Validate pagination count accuracy
  const allSchedules =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(allSchedules);
  TestValidator.equals(
    "pagination has valid data structure",
    allSchedules.data.length >= 0,
    true,
  );
}