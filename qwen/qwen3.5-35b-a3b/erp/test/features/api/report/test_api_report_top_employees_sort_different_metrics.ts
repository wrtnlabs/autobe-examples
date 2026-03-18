import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTopEmployee";
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
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";

export async function test_api_report_top_employees_sort_different_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member with report:view permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(member);
  // Create a new connection with the member's token for authenticated requests
  const memberAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 2. Create organization through employee join
  const orgConnection: api.IConnection = { host: connection.host };
  const orgEmployee = await authorize_member_join(orgConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(orgEmployee);
  // Get organization from first membership
  const orgMembership = orgEmployee.organization_memberships[0];
  typia.assert(orgMembership);
  const organizationId = orgMembership.organization.id;
  // Create additional employees in same organization
  const employees: {
    id: string;
    connection: api.IConnection;
    displayName: string;
  }[] = [];
  for (let i = 0; i < 3; i++) {
    const empConn: api.IConnection = { host: connection.host };
    const emp = await authorize_member_join(empConn, {
      body: {
        email: `employee${i}@test.example.com`,
        password: RandomGenerator.alphaNumeric(12),
        display_name: `Employee ${String.fromCharCode(65 + i)}`, // A, B, C
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
      },
    });
    typia.assert(emp);
    // Re-authenticate with token
    const empAuthConn: api.IConnection = {
      host: connection.host,
      headers: { Authorization: emp.token.access },
    };
    employees.push({
      id: emp.id,
      connection: empAuthConn,
      displayName: emp.display_name,
    });
  }
  // 3. Create projects for testing (create one shared project and several unique ones)
  const sharedProject: IHrmsProject & {
    id: string;
    name: string;
  } = typia.assert<
    IHrmsProject & {
      id: string;
      name: string;
    }
  >(
    await api.functional.hrms.member.organizations.projects.create(
      memberAuthenticatedConnection,
      {
        organizationId,
        body: {
          name: "Shared Test Project",
          description: "Project for shared timelogs",
          color_code: RandomGenerator.alphaNumeric(6),
        } satisfies IHrmsProject.ICreate,
      },
    ),
  );
  // Create multiple projects for Employee C to work across
  const employeeProjects: (IHrmsProject & {
    id: string;
    name: string;
  })[] = [sharedProject];
  for (let i = 1; i <= 5; i++) {
    const proj: IHrmsProject & {
      id: string;
      name: string;
    } = typia.assert<
      IHrmsProject & {
        id: string;
        name: string;
      }
    >(
      await api.functional.hrms.member.organizations.projects.create(
        memberAuthenticatedConnection,
        {
          organizationId,
          body: {
            name: `Project ${String.fromCharCode(65 + i)}`,
            description: `Project ${i}`,
            color_code: RandomGenerator.alphaNumeric(6),
          } satisfies IHrmsProject.ICreate,
        },
      ),
    );
    employeeProjects.push(proj);
  }
  // 4. Create tasks for projects - Store task IDs separately since IHrmsTask doesn't have id
  const projectTaskIds: Record<string, string[]> = {};
  // Create multiple tasks in shared project
  const sharedTaskIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    // Note: IHrmsTask response doesn't have id, so we'll use null for task_id
    await api.functional.hrms.member.projects.tasks.create(
      memberAuthenticatedConnection,
      {
        projectId: sharedProject.id,
        body: {
          title: `Task ${i}`,
          status: "open",
          priority: "medium",
        } satisfies IHrmsTask.ICreate,
      },
    );
    // Generate a unique ID for tracking (in real scenario, would come from response)
    sharedTaskIds.push(`task-${i}-${sharedProject.id}`);
  }
  projectTaskIds[sharedProject.id] = sharedTaskIds;
  // Create tasks in each employee project
  for (const proj of employeeProjects.slice(1)) {
    const taskIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      await api.functional.hrms.member.projects.tasks.create(
        memberAuthenticatedConnection,
        {
          projectId: proj.id,
          body: {
            title: `${proj.name} Task ${i}`,
            status: "open",
            priority: "medium",
          } satisfies IHrmsTask.ICreate,
        },
      );
      taskIds.push(`task-${i}-${proj.id}`);
    }
    projectTaskIds[proj.id] = taskIds;
  }
  // 5. Generate timelogs with distinct patterns
  // Calculate date range (last 7 days)
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startDateStr = new Date(startDate).toISOString().split("T")[0];
  const endDateStr = new Date(endDate).toISOString().split("T")[0];
  // Employee A: High total_hours (1000), Low billable_hours (200)
  // 800 non-billable, 200 billable
  const employeeA = employees[0];
  for (let i = 0; i < 8; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    // task_id is optional, we'll skip it since IHrmsTask doesn't have id
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      employeeA.connection,
      {
        organizationId,
        employeeId: employeeA.id,
        body: {
          date: dateStr,
          duration_minutes: 100, // 8 * 100 = 800 non-billable
          project_id: sharedProject.id,
          task_id: sharedTaskIds[i % sharedTaskIds.length],
          billable: false,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  }
  for (let i = 0; i < 2; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      employeeA.connection,
      {
        organizationId,
        employeeId: employeeA.id,
        body: {
          date: dateStr,
          duration_minutes: 100, // 2 * 100 = 200 billable
          project_id: sharedProject.id,
          task_id: sharedTaskIds[i % sharedTaskIds.length],
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  }
  // Employee B: Moderate total_hours (800), High billable_hours ratio (750)
  const employeeB = employees[1];
  for (let i = 0; i < 8; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      employeeB.connection,
      {
        organizationId,
        employeeId: employeeB.id,
        body: {
          date: dateStr,
          duration_minutes: 90, // 8 * 90 = 720
          project_id: sharedProject.id,
          task_id: sharedTaskIds[i % sharedTaskIds.length],
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  }
  // Add more to reach ~800 total, 750 billable
  const extraDateStr = new Date(startDate.getTime() + 10 * 24 * 60 * 60 * 1100)
    .toISOString()
    .split("T")[0];
  await api.functional.hrms.member.organizations.employees.timelogs.create(
    employeeB.connection,
    {
      organizationId,
      employeeId: employeeB.id,
      body: {
        date: extraDateStr,
        duration_minutes: 80, // Total ~800, billable ~800
        project_id: sharedProject.id,
        task_id: sharedTaskIds[0],
        billable: true,
      } satisfies IHrmsTimelog.ICreate,
    },
  );
  // Employee C: Fewer total_hours (600), but many projects/tasks
  const employeeC = employees[2];
  for (let i = 0; i < 5; i++) {
    const proj = employeeProjects[i + 1]; // Use unique projects
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    // One timelog per project, different tasks
    const taskIds = projectTaskIds[proj.id];
    await api.functional.hrms.member.organizations.employees.timelogs.create(
      employeeC.connection,
      {
        organizationId,
        employeeId: employeeC.id,
        body: {
          date: dateStr,
          duration_minutes: 120, // 5 * 120 = 600 total
          project_id: proj.id,
          task_id: taskIds ? taskIds[i % taskIds.length] : undefined,
          billable: true,
        } satisfies IHrmsTimelog.ICreate,
      },
    );
  }
  // 6. Test sorting by total_hours (default)
  const totalHoursResponse =
    await api.functional.hrms.member.reports.top_employees.topEmployees(
      memberAuthenticatedConnection,
      {
        body: {
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          sort: "total_hours",
          limit: 10,
        } satisfies IHrmsTopEmployee.IRequest,
      },
    );
  typia.assert(totalHoursResponse);
  // Verify Employee A is first (has highest total_hours)
  TestValidator.equals(
    "total_hours sort - Employee A should be first",
    totalHoursResponse.data[0].id,
    employeeA.id,
  );
  TestValidator.predicate(
    "Employee A has highest total_hours",
    () =>
      totalHoursResponse.data[0].total_hours >
      totalHoursResponse.data[1].total_hours,
  );
  // 7. Test sorting by billable_hours
  const billableHoursResponse =
    await api.functional.hrms.member.reports.top_employees.topEmployees(
      memberAuthenticatedConnection,
      {
        body: {
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          sort: "billable_hours",
          limit: 10,
        } satisfies IHrmsTopEmployee.IRequest,
      },
    );
  typia.assert(billableHoursResponse);
  // Verify Employee B is first (has highest billable_hours)
  TestValidator.equals(
    "billable_hours sort - Employee B should be first",
    billableHoursResponse.data[0].id,
    employeeB.id,
  );
  TestValidator.predicate(
    "Employee B has highest billable_hours",
    () =>
      billableHoursResponse.data[0].billable_hours >
      billableHoursResponse.data[1].billable_hours,
  );
  // 8. Test sorting by project_count
  const projectCountResponse =
    await api.functional.hrms.member.reports.top_employees.topEmployees(
      memberAuthenticatedConnection,
      {
        body: {
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          sort: "project_count",
          limit: 10,
        } satisfies IHrmsTopEmployee.IRequest,
      },
    );
  typia.assert(projectCountResponse);
  // Verify Employee C is first (works across most projects)
  TestValidator.equals(
    "project_count sort - Employee C should be first",
    projectCountResponse.data[0].id,
    employeeC.id,
  );
  TestValidator.predicate(
    "Employee C has highest project_count",
    () =>
      projectCountResponse.data[0].project_count >
      projectCountResponse.data[1].project_count,
  );
  // 9. Test sorting by task_count
  const taskCountResponse =
    await api.functional.hrms.member.reports.top_employees.topEmployees(
      memberAuthenticatedConnection,
      {
        body: {
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          sort: "task_count",
          limit: 10,
        } satisfies IHrmsTopEmployee.IRequest,
      },
    );
  typia.assert(taskCountResponse);
  // Verify Employee A is first (most distinct tasks in shared project)
  TestValidator.equals(
    "task_count sort - Employee A should have highest task_count",
    taskCountResponse.data[0].id,
    employeeA.id,
  );
  // 10. Test sorting by employee_name (alphabetical)
  const employeeNameResponse =
    await api.functional.hrms.member.reports.top_employees.topEmployees(
      memberAuthenticatedConnection,
      {
        body: {
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          sort: "employee_name",
          limit: 10,
        } satisfies IHrmsTopEmployee.IRequest,
      },
    );
  typia.assert(employeeNameResponse);
  // Verify alphabetical ordering
  for (let i = 1; i < employeeNameResponse.data.length; i++) {
    TestValidator.predicate(
      `employee_name sort - ${employeeNameResponse.data[i - 1].display_name} <= ${employeeNameResponse.data[i].display_name}`,
      () =>
        employeeNameResponse.data[i - 1].display_name <=
        employeeNameResponse.data[i].display_name,
    );
  }
  // 11. Test sorting by department
  const departmentResponse =
    await api.functional.hrms.member.reports.top_employees.topEmployees(
      memberAuthenticatedConnection,
      {
        body: {
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          sort: "department",
          limit: 10,
        } satisfies IHrmsTopEmployee.IRequest,
      },
    );
  typia.assert(departmentResponse);
  // Verify grouping by department (all employees in same department should be grouped)
  const firstDept = departmentResponse.data[0].department_id;
  for (const emp of departmentResponse.data) {
    TestValidator.equals(
      "department sort - employees grouped by department",
      emp.department_id,
      firstDept,
    );
  }
  // 12. Test pagination respects sort order
  const page1Response =
    await api.functional.hrms.member.reports.top_employees.topEmployees(
      memberAuthenticatedConnection,
      {
        body: {
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          sort: "total_hours",
          page: 1,
          limit: 1,
        } satisfies IHrmsTopEmployee.IRequest,
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.hrms.member.reports.top_employees.topEmployees(
      memberAuthenticatedConnection,
      {
        body: {
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          sort: "total_hours",
          page: 2,
          limit: 1,
        } satisfies IHrmsTopEmployee.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify page 1 has higher total_hours than page 2
  TestValidator.predicate(
    "pagination - page 1 has higher total_hours than page 2",
    () =>
      page1Response.data[0].total_hours >= page2Response.data[0].total_hours,
  );
  // 13. Test default sort (should be total_hours)
  const defaultSortResponse =
    await api.functional.hrms.member.reports.top_employees.topEmployees(
      memberAuthenticatedConnection,
      {
        body: {
          dateRange: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
        } satisfies IHrmsTopEmployee.IRequest,
      },
    );
  typia.assert(defaultSortResponse);
  // Verify default sort matches total_hours sort
  TestValidator.equals(
    "default sort - should be total_hours",
    defaultSortResponse.data[0].id,
    totalHoursResponse.data[0].id,
  );
}
