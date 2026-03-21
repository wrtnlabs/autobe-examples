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

export async function test_api_timesheet_approval_by_manager_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner/manager with organization (gets time:approve permission)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuth);
  // Step 2: Create organization (manager becomes owner with full permissions including time:approve)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create employee member who will submit timesheet
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  // Step 4: Create employee record for the employee member
  // Note: roleId is handled by the helper function
  const employee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {
      body: {
        email: employeeAuth.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employee);
  // Step 5: Create a project for the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // Step 6: Calculate week start date (Monday of current week)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() - daysToMonday);
  weekStartDate.setHours(0, 0, 0, 0);
  // Step 7: Create timelog entries for the employee within the work week
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: weekStartDate.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: new Date(weekStartDate.getTime() + 86400000).toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // Step 8: Create a draft timesheet for the work week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Step 9: Submit the timesheet (transition to 'submitted' status)
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Validate submitted state
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    submittedTimesheet.submitted_at !== null,
  );
  const submittedAt = submittedTimesheet.submitted_at!;
  // Step 10: Manager approves the timesheet
  const approvedTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(managerConnection, {
      timesheetId: submittedTimesheet.id,
    });
  typia.assert(approvedTimesheet);
  // Validations
  // 1. Status should be 'approved'
  TestValidator.equals(
    "timesheet status is approved",
    approvedTimesheet.status,
    "approved",
  );
  // 2. Reviewer should be populated with manager's member information
  TestValidator.predicate(
    "reviewer is set",
    approvedTimesheet.reviewer !== null,
  );
  if (approvedTimesheet.reviewer !== null) {
    TestValidator.equals(
      "reviewer is the manager",
      approvedTimesheet.reviewer.id,
      managerAuth.id,
    );
    TestValidator.equals(
      "reviewer email matches",
      approvedTimesheet.reviewer.email,
      managerAuth.email,
    );
  }
  // 3. reviewed_at should be set
  TestValidator.predicate(
    "reviewed_at is set",
    approvedTimesheet.reviewed_at !== null,
  );
  // 4. reviewed_at should be after or equal to submitted_at
  if (approvedTimesheet.reviewed_at !== null) {
    TestValidator.predicate(
      "reviewed_at is after submitted_at",
      new Date(approvedTimesheet.reviewed_at).getTime() >=
        new Date(submittedAt).getTime(),
    );
  }
  // 5. updated_at should be after or equal to submitted_at
  TestValidator.predicate(
    "updated_at is after submitted_at",
    new Date(approvedTimesheet.updated_at).getTime() >=
      new Date(submittedAt).getTime(),
  );
  // 6. All timelogs should remain accessible
  TestValidator.predicate(
    "timesheet has timelogs",
    approvedTimesheet.timelogs.length >= 2,
  );
  // Verify timelog data integrity
  const timelogIds = approvedTimesheet.timelogs.map((tl) => tl.id);
  TestValidator.predicate(
    "timelog1 exists in timesheet",
    timelogIds.includes(timelog1.id),
  );
  TestValidator.predicate(
    "timelog2 exists in timesheet",
    timelogIds.includes(timelog2.id),
  );
  // Verify total hours calculation
  const totalMinutes = approvedTimesheet.timelogs.reduce(
    (sum, tl) => sum + tl.duration,
    0,
  );
  const expectedTotalHours = totalMinutes / 60;
  TestValidator.equals(
    "total hours matches timelog sum",
    approvedTimesheet.total_hours,
    expectedTotalHours,
  );
}
