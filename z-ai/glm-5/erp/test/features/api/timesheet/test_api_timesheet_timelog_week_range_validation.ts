import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
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
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelog_week_range_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project for timelog entries
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Define week dates
  // Week A: Monday 2024-01-01 to Sunday 2024-01-07
  const weekAStart = new Date("2024-01-01T00:00:00.000Z");
  const weekAMid = new Date("2024-01-03T00:00:00.000Z");
  // Week B: Monday 2024-01-08 to Sunday 2024-01-14
  const weekBStart = new Date("2024-01-08T00:00:00.000Z");
  const weekBMid = new Date("2024-01-10T00:00:00.000Z");
  // 4. Create timelogs for Week A
  const timelogA1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: weekAStart.toISOString(),
        duration: 120,
        description: "Week A timelog 1",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelogA1);
  const timelogA2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: weekAMid.toISOString(),
        duration: 180,
        description: "Week A timelog 2",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelogA2);
  // 5. Create timelogs for Week B
  const timelogB1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: weekBStart.toISOString(),
        duration: 90,
        description: "Week B timelog 1",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelogB1);
  const timelogB2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: weekBMid.toISOString(),
        duration: 150,
        description: "Week B timelog 2",
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelogB2);
  // 6. Create a draft timesheet for Week A
  const timesheetA = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekAStart.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheetA);
  // 7. Attempt to add Week B timelogs to Week A timesheet - should fail
  await TestValidator.error(
    "should reject timelogs outside timesheet week range",
    async () => {
      await api.functional.erpHrm.member.timesheets.timelogs.addTimelogs(
        memberConnection,
        {
          timesheetId: timesheetA.id,
          body: {
            timelogIds: [timelogB1.id, timelogB2.id],
          } satisfies IErpHrmTimesheet.IAddTimelog,
        },
      );
    },
  );
  // 8. Add Week A timelogs successfully to Week A timesheet
  const updatedTimesheetA =
    await api.functional.erpHrm.member.timesheets.timelogs.addTimelogs(
      memberConnection,
      {
        timesheetId: timesheetA.id,
        body: {
          timelogIds: [timelogA1.id, timelogA2.id],
        } satisfies IErpHrmTimesheet.IAddTimelog,
      },
    );
  typia.assert(updatedTimesheetA);
  // 9. Verify total_hours reflects only Week A timelogs (120 + 180 = 300 minutes = 5 hours)
  TestValidator.equals(
    "total hours should be sum of Week A timelogs",
    updatedTimesheetA.total_hours,
    5,
  );
  // 10. Create a separate timesheet for Week B
  const timesheetB = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekBStart.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheetB);
  // 11. Add Week B timelogs to Week B timesheet successfully
  const updatedTimesheetB =
    await api.functional.erpHrm.member.timesheets.timelogs.addTimelogs(
      memberConnection,
      {
        timesheetId: timesheetB.id,
        body: {
          timelogIds: [timelogB1.id, timelogB2.id],
        } satisfies IErpHrmTimesheet.IAddTimelog,
      },
    );
  typia.assert(updatedTimesheetB);
  // 12. Verify total_hours reflects only Week B timelogs (90 + 150 = 240 minutes = 4 hours)
  TestValidator.equals(
    "total hours should be sum of Week B timelogs",
    updatedTimesheetB.total_hours,
    4,
  );
}
