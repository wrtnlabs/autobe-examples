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
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // Step 2: Create an organization (member becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create an employee record for the authenticated member
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        email: member.email,
      },
    },
  );
  typia.assert(employee);
  // Step 4: Create a project for timelogs
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Step 5: Create a timelog entry within a specific week
  // Use Monday as the date for the timelog (to align with timesheet week)
  const weekStartDate = new Date();
  // Find Monday of current week
  const dayOfWeek = weekStartDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStartDate.setDate(weekStartDate.getDate() + daysToMonday);
  weekStartDate.setHours(0, 0, 0, 0);
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: weekStartDate.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // Step 6: Create a draft timesheet for that week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify initial timesheet is in draft status
  TestValidator.equals("initial status is draft", timesheet.status, "draft");
  // Store initial values for comparison
  const initialTimelogCount = timesheet.timelogs.length;
  const initialTotalHours = timesheet.total_hours;
  // Step 7: Submit the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Step 8: Verify status changed to 'submitted'
  TestValidator.equals(
    "status changed to submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // Step 9: Verify submitted_at timestamp is populated
  TestValidator.predicate(
    "submitted_at is populated",
    submittedTimesheet.submitted_at !== null &&
      submittedTimesheet.submitted_at !== undefined,
  );
  // Step 10: Verify submitted_at is a valid date-time
  const submittedAtDate = new Date(submittedTimesheet.submitted_at!);
  TestValidator.predicate(
    "submitted_at is valid date",
    !isNaN(submittedAtDate.getTime()),
  );
  // Step 11: Verify timesheet retains all associated timelogs
  TestValidator.equals(
    "timelogs count preserved",
    submittedTimesheet.timelogs.length,
    initialTimelogCount,
  );
  // Step 12: Verify total_hours is correctly calculated
  TestValidator.predicate(
    "total_hours is valid",
    submittedTimesheet.total_hours >= 0,
  );
  // Verify total_hours matches expected sum from timelogs
  const expectedTotalHours = submittedTimesheet.timelogs.reduce(
    (sum, tl) => sum + tl.duration / 60,
    0,
  );
  TestValidator.equals(
    "total_hours matches timelog sum",
    submittedTimesheet.total_hours,
    expectedTotalHours,
  );
  // Step 13: Verify timesheet ID remains the same
  TestValidator.equals(
    "timesheet ID unchanged",
    submittedTimesheet.id,
    timesheet.id,
  );
  // Step 14: Verify employee remains the same
  TestValidator.equals(
    "employee ID unchanged",
    submittedTimesheet.employee.id,
    employee.id,
  );
  // Step 15: Verify week dates remain unchanged
  TestValidator.equals(
    "week_start_date unchanged",
    submittedTimesheet.week_start_date,
    timesheet.week_start_date,
  );
  TestValidator.equals(
    "week_end_date unchanged",
    submittedTimesheet.week_end_date,
    timesheet.week_end_date,
  );
  // Step 16: Verify reviewer is null (not yet reviewed)
  TestValidator.predicate(
    "reviewer is null before approval",
    submittedTimesheet.reviewer === null,
  );
  // Step 17: Verify reviewed_at is null (not yet reviewed)
  TestValidator.predicate(
    "reviewed_at is null before approval",
    submittedTimesheet.reviewed_at === null,
  );
  // Step 18: Verify rejection_reason is null (not rejected)
  TestValidator.predicate(
    "rejection_reason is null",
    submittedTimesheet.rejection_reason === null,
  );
}
