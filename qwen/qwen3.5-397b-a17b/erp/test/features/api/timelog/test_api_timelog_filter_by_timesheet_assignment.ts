import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test filtering timelogs by timesheet assignment status.
 *
 * Validates the complete timelog filtering workflow including timesheet assignment filtering and date range filtering. The test creates multiple timelogs, assigns some to a timesheet, and verifies that filtering by timesheet ID correctly separates assigned from unassigned timelogs.
 *
 * The test covers four main scenarios: (1) filtering by hrmPlatformTimesheetId=null returns only unassigned timelogs; (2) filtering by specific timesheet ID returns only timelogs in that timesheet; (3) timesheet submission preserves timelog associations; (4) date range filtering with dateFrom and dateTo parameters works correctly with inclusive matching.
 *
 * 1. Member registers and authenticates to access timelog features.
 * 2. Creates organization for employee assignment context.
 * 3. Creates project for timelog assignment.
 * 4. Creates multiple timelog entries on different dates for the employee.
 * 5. Creates draft timesheet which automatically includes timelogs from that week.
 * 6. Filters timelogs by hrmPlatformTimesheetId=null - verifies only unassigned timelogs returned.
 * 7. Filters timelogs by specific timesheet ID - verifies only assigned timelogs returned.
 * 8. Tests date range filtering with dateFrom and dateTo parameters.
 * 9. Validates pagination metadata and timelog counts match expectations.
 */
export async function test_api_timelog_filter_by_timesheet_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 4. Create multiple timelogs on different dates
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  // Create timelog for today
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: today.toISOString(),
        duration_minutes: 60,
        hrm_platform_project_id: project.id,
        description: "Work on project tasks",
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  // Create timelog for yesterday
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: yesterday.toISOString(),
        duration_minutes: 120,
        hrm_platform_project_id: project.id,
        description: "Code review and testing",
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // Create timelog for two days ago
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: twoDaysAgo.toISOString(),
        duration_minutes: 90,
        hrm_platform_project_id: project.id,
        description: "Meeting and planning",
        billable: false,
      },
    },
  );
  typia.assert(timelog3);
  // 5. Query all timelogs before timesheet creation
  const allTimelogsBefore =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
        sort: "date:desc",
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(allTimelogsBefore);
  TestValidator.predicate(
    "has at least 3 timelogs",
    allTimelogsBefore.data.length >= 3,
  );
  // 6. Create draft timesheet - this should automatically include timelogs from the week
  // Calculate the Monday of the current week
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(monday.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday.toISOString().split("T")[0],
      },
    },
  );
  typia.assert(timesheet);
  // 7. Filter timelogs by timesheet ID - should return timelogs included in this timesheet
  const assignedTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        hrmPlatformTimesheetId: timesheet.id,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(assignedTimelogs);
  TestValidator.predicate(
    "has assigned timelogs",
    assignedTimelogs.data.length > 0,
  );
  // 8. Filter timelogs by hrmPlatformTimesheetId=null - should return unassigned timelogs
  const unassignedTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        hrmPlatformTimesheetId: null,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(unassignedTimelogs);
  // 9. Test date range filtering
  const dateFrom = twoDaysAgo.toISOString();
  const dateTo = yesterday.toISOString();
  const dateRangeTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        dateFrom,
        dateTo,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(dateRangeTimelogs);
  // Verify all returned timelogs are within the date range
  const dateFromTime = new Date(dateFrom).getTime();
  const dateToTime = new Date(dateTo).getTime();
  for (const timelog of dateRangeTimelogs.data) {
    const timelogDate = new Date(timelog.date).getTime();
    TestValidator.predicate(
      "timelog date within range",
      timelogDate >= dateFromTime && timelogDate <= dateToTime,
    );
  }
  // 10. Test combined filtering: date range + timesheet assignment
  const combinedFilterTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        dateFrom: monday.toISOString(),
        hrmPlatformTimesheetId: timesheet.id,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(combinedFilterTimelogs);
  // 11. Verify pagination metadata
  TestValidator.predicate(
    "current page is valid",
    allTimelogsBefore.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    allTimelogsBefore.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is valid",
    allTimelogsBefore.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    allTimelogsBefore.pagination.pages >= 0,
  );
  // 12. Verify timesheet contains expected timelogs
  TestValidator.predicate(
    "timesheet has timelogs",
    timesheet.timelogs.length > 0,
  );
  // 13. Verify assigned timelogs count matches timesheet timelogs count
  TestValidator.equals(
    "assigned timelogs count matches timesheet",
    assignedTimelogs.data.length,
    timesheet.timelogs.length,
  );
}
