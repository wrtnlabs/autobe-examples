import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

export async function test_api_task_assignment_non_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as project-lead member using utility function
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadMember = await authorize_member_join(projectLeadConnection, {
    body: {
      email: "projectlead@test.com",
      password: "password123",
      display_name: "Project Lead",
    },
  });
  typia.assert(projectLeadMember);
  // 2. Project-lead joins organization
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      projectLeadConnection,
      {
        body: {
          name: "Test Organization",
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Auth as non-project member employee using utility function
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeConnection, {
    body: {
      email: "employee@test.com",
      password: "password123",
      display_name: "Employee",
    },
  });
  typia.assert(employeeMember);
  // 4. Non-project member joins same organization
  const employeeOrganization =
    await generate_random_hrm_tracker_member_organizations_create(
      employeeConnection,
      {
        body: {
          name: "Test Organization",
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(employeeOrganization);
  // 5. Create project by project-lead
  const project = await generate_random_hrm_tracker_member_projects_create(
    projectLeadConnection,
    {
      body: {
        name: "Test Project",
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 6. Assign project-lead as project member
  const projectMember =
    await generate_random_hrm_tracker_member_projects_project_members_create(
      projectLeadConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_tracker_employee_id: projectLeadMember.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  // 7. Create employee profile for non-project member
  const employee = await generate_random_hrm_tracker_member_employees_create(
    employeeConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: null,
        department_id: null,
        role_id: null,
        organization_id: employeeOrganization.id,
        user_id: employeeMember.id,
      },
    },
  );
  typia.assert(employee);
  // 8. Attempt to create a task with the non-project member as assignee
  // This should fail with an error since the employee is not a project member
  await TestValidator.error(
    "task assignment should fail for non-project member",
    async () => {
      await api.functional.hrmTracker.member.projects.tasks.create(
        projectLeadConnection,
        {
          projectId: project.id,
          body: {
            title: "Test Task",
            status: "open",
            priority: "medium",
            assigned_employee_id: employee.id,
          },
        },
      );
    },
  );
}