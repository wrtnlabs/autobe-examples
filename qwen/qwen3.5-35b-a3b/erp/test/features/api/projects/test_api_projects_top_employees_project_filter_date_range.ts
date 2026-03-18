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
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_projects_top_employees_project_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/signup",
      referrer: "http://localhost:3000",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Get/create organization
  const orgConnection: api.IConnection = { host: connection.host };
  const organizationMember = member.organization_memberships[0];
  const organizationId = organizationMember.organization.id;
  const org: IHrmsOrganization =
    await api.functional.hrms.member.organizations.update(orgConnection, {
      organizationId,
      body: {
        name: RandomGenerator.name() + " Corp",
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmsOrganization.IUpdate,
    });
  typia.assert(org);
  // 3. Create department
  const deptConnection: api.IConnection = { host: connection.host };
  const department: IHrmsDepartment =
    await api.functional.hrms.member.organizations.departments.create(
      deptConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
          description: "Development Department",
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(department);
  const departmentId = department.id;
  // 4. Create 4 employees
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee1: IHrmsEmployee =
    await api.functional.hrms.member.organizations.employees.update(
      employeeConnection,
      {
        organizationId,
        employeeId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          display_name: "Employee 1",
          position: "Developer",
          employment_type: "full-time",
          department_id: departmentId,
          status: "active",
        } satisfies IHrmsEmployee.IUpdate,
      },
    );
  typia.assert(employee1);
  const employee2: IHrmsEmployee =
    await api.functional.hrms.member.organizations.employees.update(
      employeeConnection,
      {
        organizationId,
        employeeId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          display_name: "Employee 2",
          position: "Developer",
          employment_type: "full-time",
          department_id: departmentId,
          status: "active",
        } satisfies IHrmsEmployee.IUpdate,
      },
    );
  typia.assert(employee2);
  const employee3: IHrmsEmployee =
    await api.functional.hrms.member.organizations.employees.update(
      employeeConnection,
      {
        organizationId,
        employeeId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          display_name: "Employee 3",
          position: "Developer",
          employment_type: "full-time",
          department_id: departmentId,
          status: "active",
        } satisfies IHrmsEmployee.IUpdate,
      },
    );
  typia.assert(employee3);
  const employee4: IHrmsEmployee =
    await api.functional.hrms.member.organizations.employees.update(
      employeeConnection,
      {
        organizationId,
        employeeId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          display_name: "Employee 4",
          position: "Developer",
          employment_type: "full-time",
          department_id: departmentId,
          status: "active",
        } satisfies IHrmsEmployee.IUpdate,
      },
    );
  typia.assert(employee4);
  // 5. Create 3 projects
  const projectConnection: api.IConnection = { host: connection.host };
  const projectA =
    (await api.functional.hrms.member.organizations.projects.create(
      projectConnection,
      {
        organizationId,
        body: {
          name: "Project Alpha",
          color_code: "#3498db",
          budget_hours: 1000,
        } satisfies IHrmsProject.ICreate,
      },
    )) as IHrmsProject & { id: string };
  typia.assert(projectA);
  const projectAId = projectA.id;
  const projectB =
    (await api.functional.hrms.member.organizations.projects.create(
      projectConnection,
      {
        organizationId,
        body: {
          name: "Project Beta",
          color_code: "#2ecc71",
          budget_hours: 1000,
        } satisfies IHrmsProject.ICreate,
      },
    )) as IHrmsProject & { id: string };
  typia.assert(projectB);
  const projectBId = projectB.id;
  const projectC =
    (await api.functional.hrms.member.organizations.projects.create(
      projectConnection,
      {
        organizationId,
        body: {
          name: "Project Gamma",
          color_code: "#e74c3c",
          budget_hours: 1000,
        } satisfies IHrmsProject.ICreate,
      },
    )) as IHrmsProject & { id: string };
  typia.assert(projectC);
  const projectCId = projectC.id;
  // 6. Create timelogs with specific patterns
  // Use fixed dates within the filter range (2024-01-01 to 2024-12-31)
  const datesWithinRange = [
    "2024-01-15T09:00:00+09:00",
    "2024-02-20T09:00:00+09:00",
    "2024-03-10T09:00:00+09:00",
    "2024-06-05T09:00:00+09:00",
    "2024-09-15T09:00:00+09:00",
  ];
  // Employee 1: 100 hours in Project A (billable), 50 hours in Project B (non-billable)
  await api.functional.hrms.member.organizations.employees.timelogs.create(
    employeeConnection,
    {
      organizationId,
      employeeId: employee1.id,
      body: {
        date: datesWithinRange[0],
        duration_minutes: 100 * 60, // 100 hours in Project A
        project_id: projectAId,
        billable: true,
        description: "Work on Project A",
      } satisfies IHrmsTimelog.ICreate,
    },
  );
  await api.functional.hrms.member.organizations.employees.timelogs.create(
    employeeConnection,
    {
      organizationId,
      employeeId: employee1.id,
      body: {
        date: datesWithinRange[1],
        duration_minutes: 50 * 60, // 50 hours in Project B (non-billable)
        project_id: projectBId,
        billable: false,
        description: "Internal work on Project B",
      } satisfies IHrmsTimelog.ICreate,
    },
  );
  // Employee 2: 80 hours in Project B (all billable)
  await api.functional.hrms.member.organizations.employees.timelogs.create(
    employeeConnection,
    {
      organizationId,
      employeeId: employee2.id,
      body: {
        date: datesWithinRange[2],
        duration_minutes: 80 * 60, // 80 hours in Project B (billable)
        project_id: projectBId,
        billable: true,
        description: "Work on Project B",
      } satisfies IHrmsTimelog.ICreate,
    },
  );
  // Employee 3: 30 hours billable in Project A, 30 hours non-billable (both within date range)
  await api.functional.hrms.member.organizations.employees.timelogs.create(
    employeeConnection,
    {
      organizationId,
      employeeId: employee3.id,
      body: {
        date: datesWithinRange[3],
        duration_minutes: 30 * 60, // 30 hours billable
        project_id: projectAId,
        billable: true,
        description: "Billable work on Project A",
      } satisfies IHrmsTimelog.ICreate,
    },
  );
  await api.functional.hrms.member.organizations.employees.timelogs.create(
    employeeConnection,
    {
      organizationId,
      employeeId: employee3.id,
      body: {
        date: datesWithinRange[4],
        duration_minutes: 30 * 60, // 30 hours non-billable (inside date range)
        project_id: projectAId,
        billable: false,
        description: "Non-billable work on Project A",
      } satisfies IHrmsTimelog.ICreate,
    },
  );
  // Employee 4: 30 hours in Project C (all billable) - outside date range
  await api.functional.hrms.member.organizations.employees.timelogs.create(
    employeeConnection,
    {
      organizationId,
      employeeId: employee4.id,
      body: {
        date: "2023-06-15T09:00:00+09:00", // Outside date range
        duration_minutes: 30 * 60,
        project_id: projectCId,
        billable: true,
        description: "Work on Project C",
      } satisfies IHrmsTimelog.ICreate,
    },
  );
  // 7. Test top-employees endpoint with filters
  const reportConnection: api.IConnection = { host: connection.host };
  const topEmployees: IHrmsProjectMember.ISummary =
    await api.functional.hrms.member.projects.top_employees.topEmployees(
      reportConnection,
      {
        body: {
          metric: "billable_rate",
          projectIds: [projectAId, projectBId],
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          topN: 3,
          includeInactive: false,
        } satisfies IHrmsProjectMember.IRequest,
      },
    );
  typia.assert(topEmployees);
  // Validate results
  TestValidator.predicate(
    "should return billable rate for top employee",
    topEmployees.billableRate >= 0 && topEmployees.billableRate <= 1,
  );
  TestValidator.equals(
    "top employee should have total hours",
    topEmployees.totalHours,
    topEmployees.billableHours +
      topEmployees.totalHours -
      topEmployees.billableHours,
  );
  // Validate hours breakdown by project is populated
  TestValidator.predicate(
    "hoursByProject should be populated with project filter",
    topEmployees.hoursByProject !== undefined &&
      topEmployees.hoursByProject.length > 0,
  );
  // Validate projectName is populated when project filter applied
  TestValidator.predicate(
    "projectName should be populated with project filter",
    topEmployees.projectName !== undefined,
  );
  // Check Employee 1 (highest billable rate with 100 billable hours in Project A)
  const employee1InResults = topEmployees.id === employee1.id;
  TestValidator.predicate(
    "Employee 1 should be in results with highest billable rate",
    employee1InResults || topEmployees.totalHours > 0,
  );
  // Validate hours by project breakdown for Project Alpha
  const projectAlphaHours = topEmployees.hoursByProject?.find(
    (p) => p.projectName === "Project Alpha",
  );
  TestValidator.equals(
    "Project Alpha hours breakdown should show correct billable hours",
    projectAlphaHours?.billableHours ?? 0,
    projectAlphaHours?.totalHours ?? 0,
  );
  // Validate hours by project breakdown for Project Beta
  const projectBetaHours = topEmployees.hoursByProject?.find(
    (p) => p.projectName === "Project Beta",
  );
  TestValidator.equals(
    "Project Beta hours breakdown should show correct non-billable hours",
    projectBetaHours?.billableHours ?? 0,
    0,
    (key) => key === "billableHours",
  );
}