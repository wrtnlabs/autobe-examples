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

export async function test_api_timesheet_timelog_override_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 3. Create timelogs for the same week (using Monday of current week)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOfWeek = new Date(now);
  mondayOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  mondayOfWeek.setHours(0, 0, 0, 0);
  const timelogDate = mondayOfWeek.toISOString();
  // Create first timelog
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    ownerConnection,
    {
      body: {
        project_id: project.id,
        date: timelogDate,
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  // Create second timelog for the same week
  const tuesdayOfWeek = new Date(mondayOfWeek);
  tuesdayOfWeek.setDate(mondayOfWeek.getDate() + 1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    ownerConnection,
    {
      body: {
        project_id: project.id,
        date: tuesdayOfWeek.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // 4. Create a timesheet for the week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    ownerConnection,
    {
      body: {
        week_start_date: mondayOfWeek.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify initial state
  TestValidator.equals("initial status is draft", timesheet.status, "draft");
  const initialHours = timesheet.total_hours;
  // 5. Submit the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(ownerConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  // 6. Approve the submitted timesheet
  const approvedTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(ownerConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "status after approve",
    approvedTimesheet.status,
    "approved",
  );
  // Store the approved hours for comparison
  const approvedTotalHours = approvedTimesheet.total_hours;
  const approvedTimelogCount = approvedTimesheet.timelogs.length;
  // 7. Create third timelog (to be added via permission override)
  const wednesdayOfWeek = new Date(mondayOfWeek);
  wednesdayOfWeek.setDate(mondayOfWeek.getDate() + 2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    ownerConnection,
    {
      body: {
        project_id: project.id,
        date: wednesdayOfWeek.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog3);
  // 8. Test permission override: modify approved timesheet by adding a timelog
  // The owner should have time:manage permission or the API allows modification on approved timesheets
  const modifiedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.updateTimelogs(
      ownerConnection,
      {
        timesheetId: timesheet.id,
        body: {
          add: [timelog3.id],
        },
      },
    );
  typia.assert(modifiedTimesheet);
  // 9. Validate results
  // (a) Modification succeeded without rejection - test passed if we reach here
  TestValidator.equals(
    "status remains approved",
    modifiedTimesheet.status,
    "approved",
  );
  // (b) total_hours is recalculated
  const expectedNewHours = approvedTotalHours + timelog3.duration / 60;
  TestValidator.equals(
    "total hours recalculated",
    modifiedTimesheet.total_hours,
    expectedNewHours,
  );
  // (c) timelog count increased
  TestValidator.equals(
    "timelog count increased",
    modifiedTimesheet.timelogs.length,
    approvedTimelogCount + 1,
  );
  // (d) Verify the new timelog is in the timesheet
  TestValidator.predicate(
    "new timelog is included",
    modifiedTimesheet.timelogs.some((t) => t.id === timelog3.id),
  );
  // 10. Test removal via permission override
  const removedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.updateTimelogs(
      ownerConnection,
      {
        timesheetId: timesheet.id,
        body: {
          remove: [timelog3.id],
        },
      },
    );
  typia.assert(removedTimesheet);
  // Validate removal
  TestValidator.equals(
    "status still approved after removal",
    removedTimesheet.status,
    "approved",
  );
  TestValidator.equals(
    "total hours recalculated after removal",
    removedTimesheet.total_hours,
    approvedTotalHours,
  );
  TestValidator.predicate(
    "removed timelog not in timesheet",
    !removedTimesheet.timelogs.some((t) => t.id === timelog3.id),
  );
}
