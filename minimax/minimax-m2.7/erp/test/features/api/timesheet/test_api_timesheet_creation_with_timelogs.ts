import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_creation_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create project for timelog creation
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3B82F6",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create week date range (Monday to Sunday)
  // Current date is 2026-03-20 (Friday), so Monday is 2026-03-16, Sunday is 2026-03-22
  const weekStartDate = new Date("2026-03-16T00:00:00.000Z");
  const weekEndDate = new Date("2026-03-22T23:59:59.999Z");
  // 4. Create timelog for Monday (2026-03-16)
  const mondayTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: weekStartDate.toISOString(),
        durationMinutes: 480, // 8 hours
        description: "Monday work session",
        billable: true,
      },
    },
  );
  typia.assert(mondayTimelog);
  // 5. Create timelog for Wednesday (2026-03-18)
  const wednesdayDate = new Date("2026-03-18T00:00:00.000Z");
  const wednesdayTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: wednesdayDate.toISOString(),
        durationMinutes: 420, // 7 hours
        description: "Wednesday work session",
        billable: true,
      },
    },
  );
  typia.assert(wednesdayTimelog);
  // 6. Create timelog for Friday (2026-03-20)
  const fridayDate = new Date("2026-03-20T00:00:00.000Z");
  const fridayTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: fridayDate.toISOString(),
        durationMinutes: 360, // 6 hours
        description: "Friday work session",
        billable: true,
      },
    },
  );
  typia.assert(fridayTimelog);
  // 7. Create draft timesheet for the week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
        week_end_date: weekEndDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 8. Validate timesheet creation
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "timesheet has employee context",
    timesheet.employee !== null && timesheet.employee !== undefined,
  );
  // 9. Validate timelogs are auto-included (should be 3)
  TestValidator.equals(
    "timesheet includes 3 timelogs",
    timesheet.timesheetTimelogs.length,
    3,
  );
  // 10. Validate total_hours calculation (480 + 420 + 360 = 1260 minutes = 21 hours)
  const expectedTotalHours = (480 + 420 + 360) / 60;
  TestValidator.equals(
    "total_hours is calculated correctly",
    timesheet.total_hours,
    expectedTotalHours,
  );
  // 11. Validate timesheetTimelogs contain nested timelog details with project associations
  for (const timesheetTimelog of timesheet.timesheetTimelogs) {
    TestValidator.predicate(
      "timesheetTimelog has id",
      timesheetTimelog.id !== null && timesheetTimelog.id !== undefined,
    );
    TestValidator.predicate(
      "timesheetTimelog has timelog details",
      timesheetTimelog.erpHrmTimelog !== null &&
        timesheetTimelog.erpHrmTimelog !== undefined,
    );
    TestValidator.predicate(
      "timesheetTimelog has project association",
      timesheetTimelog.erpHrmProject !== null &&
        timesheetTimelog.erpHrmProject !== undefined,
    );
    TestValidator.equals(
      "project matches created project",
      timesheetTimelog.erpHrmProject.id,
      project.id,
    );
    TestValidator.predicate(
      "timelog has valid duration",
      timesheetTimelog.erpHrmTimelog.duration_minutes > 0,
    );
  }
}
