import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganizationMember";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_organizations_roles_create } from "../../../generate/generate_random_hrms_member_organizations_roles_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_organization_role } from "../../../prepare/prepare_random_hrms_organization_role";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheet_update_manager_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  // 2. Use existing organization from owner's memberships
  const organization =
    ownerAuthorized.organization_memberships[0]?.organization;
  TestValidator.equals(
    "owner has organization",
    organization !== undefined,
    true,
  );
  typia.assert(organization);
  // 3. Create manager with time:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuthorized = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(managerAuthorized);
  // 4. Create custom role with time:manage permission in the organization
  const managerRole =
    await api.functional.hrms.member.organizations.roles.create(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          name: "Time Manager",
          permissions: ["time:manage", "time:view_all"],
        } satisfies IHrmsOrganizationRole.ICreate,
      },
    );
  typia.assert(managerRole);
  // 5. Create employee member (timesheet owner) - in same organization
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeAuthorized);
  // Get employee's organization member from memberships (should be same org as owner)
  const employeeOrgMember = employeeAuthorized.organization_memberships.find(
    (mem) => mem.organization.id === organization.id,
  );
  TestValidator.equals(
    "employee has access to organization",
    employeeOrgMember !== undefined,
    true,
  );
  const safeEmployeeOrgMember = typia.assert<IHrmsOrganizationMember.ISummary>(
    employeeOrgMember!,
  );
  // 6. Create employee record for the employee member using organization member ID
  const employeeRecord =
    await api.functional.hrms.member.organizations.employees.update(
      ownerConnection,
      {
        organizationId: organization.id,
        employeeId: safeEmployeeOrgMember.member.id,
        body: {
          display_name: RandomGenerator.name(),
          employment_type: "full-time",
          status: "active",
        } satisfies IHrmsEmployee.IUpdate,
      },
    );
  typia.assert(employeeRecord);
  // 7. Create project for employee's timelog
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          name: RandomGenerator.name(),
          color_code: "#3498db",
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  // 8. Create timelog for employee
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday of current week
  const projectUuid = typia.random<string & tags.Format<"uuid">>();
  const timelog =
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      employeeConnection,
      {
        organizationId: organization.id,
        employeeId: safeEmployeeOrgMember.member.id,
        body: {
          date: weekStart.toISOString().split("T")[0] + "T09:00:00",
          duration_minutes: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<60>
          >(),
          project_id: projectUuid,
          billable: true,
          description: "Test work session",
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  // 9. Create draft timesheet for employee
  const timesheet = await api.functional.hrms.member.timesheets.create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStart.toISOString(),
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // Verify timesheet is in draft status
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 10. Manager updates employee's timesheet
  const newWeekStart = new Date(weekStart);
  newWeekStart.setDate(newWeekStart.getDate() + 7); // Next week Monday
  const updatedTimesheet = await api.functional.hrms.member.timesheets.update(
    managerConnection,
    {
      timesheetId: timesheet.id,
      body: {
        week_start_date: newWeekStart.toISOString(),
      } satisfies IHrmsTimesheet.IUpdate,
    },
  );
  typia.assert(updatedTimesheet);
  // Validate update succeeded
  TestValidator.equals(
    "timesheet week_start_date updated",
    updatedTimesheet.week_start_date,
    newWeekStart.toISOString(),
  );
}
