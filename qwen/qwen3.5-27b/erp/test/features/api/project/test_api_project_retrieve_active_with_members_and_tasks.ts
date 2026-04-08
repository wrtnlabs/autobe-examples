import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_projects_members_create } from "../../../generate/generate_random_hrm_time_track_member_projects_members_create";
import { generate_random_hrm_time_track_member_tasks_create } from "../../../generate/generate_random_hrm_time_track_member_tasks_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";

/**
 * Test retrieving an active project with complete information including project members and tasks.
 *
 * Validates the complete project retrieval flow including member authentication, organization setup, employee creation, project creation with active status, member assignment, and task creation. Ensures that the retrieved project correctly includes all related entities: organization summary, project members with their roles, and tasks with their summaries.
 *
 * Special attention is given to verifying that the project status is 'active', that project members are correctly assigned with their roles, and that tasks are properly associated with the project. The test validates the complete relational structure of the project entity.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Organization is created with random settings using generate_random_hrm_time_track_member_organizations_create utility.
 * 3. Employee record is created for the authenticated member using generate_random_hrm_time_track_member_employees_create utility.
 * 4. Active project is created with name, color code, description, and optional budget/timeline using generate_random_hrm_time_track_member_projects_create utility.
 * 5. Employee is assigned as a project member with 'member' role using generate_random_hrm_time_track_member_projects_members_create utility.
 * 6. Task is created within the project using generate_random_hrm_time_track_member_tasks_create utility.
 * 7. Project is retrieved using api.functional.hrmTimeTrack.member.projects.at.
 * 8. Response is validated to ensure all related entities are correctly included.
 */
export async function test_api_project_retrieve_active_with_members_and_tasks(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection);
  typia.assert(authResult);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee record for the authenticated member
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authResult.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create active project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Assign employee as project member
  const projectMember =
    await generate_random_hrm_time_track_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create task within the project
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
      },
    },
  );
  typia.assert(task);
  // 7. Retrieve project with members and tasks
  const retrievedProject = await api.functional.hrmTimeTrack.member.projects.at(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(retrievedProject);
  // 8. Validate project information
  TestValidator.equals("project id matches", retrievedProject.id, project.id);
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project status is active",
    retrievedProject.status,
    "active",
  );
  TestValidator.equals(
    "color code matches",
    retrievedProject.color_code,
    project.color_code,
  );
  // 9. Validate organization relationship
  TestValidator.equals(
    "organization id matches",
    retrievedProject.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedProject.organization.name,
    organization.name,
  );
  // 10. Validate project members
  TestValidator.predicate(
    "project has at least one member",
    retrievedProject.projectMembers.length >= 1,
  );
  const assignedMember = retrievedProject.projectMembers.find(
    (m) => m.employee.id === employee.id,
  );
  TestValidator.predicate(
    "employee is assigned as project member",
    assignedMember !== undefined,
  );
  if (assignedMember) {
    TestValidator.equals(
      "member role is correct",
      assignedMember.role,
      "member",
    );
  }
  // 11. Validate tasks
  TestValidator.predicate(
    "project has at least one task",
    retrievedProject.tasks.length >= 1,
  );
  const createdTask = retrievedProject.tasks.find((t) => t.id === task.id);
  TestValidator.predicate(
    "task is included in project",
    createdTask !== undefined,
  );
  if (createdTask) {
    TestValidator.equals(
      "task project matches",
      createdTask.project.id,
      project.id,
    );
  }
}