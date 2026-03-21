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

export async function test_api_timesheet_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create manager member (organization owner with time:approve permission)
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = RandomGenerator.alphaNumeric(16);
  const managerName = RandomGenerator.name();
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      displayName: managerName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuth);
  // Step 2: Create employee member (separate user who will own timesheets)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeName = RandomGenerator.name();
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      displayName: employeeName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  // Step 3: Create organization (manager creates it)
  // Manager becomes the Owner with time:approve permission
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscalStartMonth: 1,
        },
      },
    );
  typia.assert(organization);
  // Step 4: Create employee record for the employee member in manager's organization
  // Note: The organization creation automatically creates Owner, Manager, and Employee roles
  // We use the employee's email to create their employee record
  // Using the built-in Employee role - since we can't query roles, we rely on the system's default setup
  const employee = await api.functional.erpHrm.member.employees.create(
    managerConnection,
    {
      body: {
        email: employeeEmail,
        roleId: organization.owner.id satisfies string & tags.Format<"uuid">,
        employmentType: "full_time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // Step 5: Create project for timelogs
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // Step 6: Create timelog for the employee (using employee's connection)
  const weekStartDate = new Date();
  // Find the Monday of the current week
  const dayOfWeek = weekStartDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStartDate.setDate(weekStartDate.getDate() + daysToMonday);
  weekStartDate.setHours(0, 0, 0, 0);
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: weekStartDate.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // Step 7: Create timesheet for the employee
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify initial timesheet status is 'draft'
  TestValidator.equals(
    "timesheet initial status is draft",
    timesheet.status,
    "draft",
  );
  // Step 8: Submit the timesheet (employee connection)
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Verify timesheet is now 'submitted'
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    submittedTimesheet.submitted_at !== null,
  );
  // Step 9: Manager rejects the submitted timesheet with a reason
  const rejectionReason =
    "Hours need to be re-categorized by project. Please update and resubmit.";
  const rejectedTimesheet =
    await api.functional.erpHrm.member.timesheets.reject(managerConnection, {
      timesheetId: timesheet.id,
      body: {
        rejection_reason: rejectionReason,
      } satisfies IErpHrmTimesheet.IReject,
    });
  typia.assert(rejectedTimesheet);
  // Validations
  TestValidator.equals(
    "timesheet status after rejection",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason matches",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    rejectedTimesheet.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer is set",
    rejectedTimesheet.reviewer !== null,
  );
  TestValidator.equals(
    "reviewer is the manager",
    rejectedTimesheet.reviewer?.id,
    managerAuth.id,
  );
}
