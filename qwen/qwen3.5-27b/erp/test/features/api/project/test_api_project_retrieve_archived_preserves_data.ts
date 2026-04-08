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
 * Test retrieving an archived project to verify data preservation while status prevents new work.
 *
 * Validates that archived projects maintain all historical data including project members, tasks, and organizational context while the archived status prevents new work from being added.
 *
 * 1. Register and authenticate as a member
 * 2. Create an organization
 * 3. Create an employee record
 * 4. Create a project with status 'active'
 * 5. Assign project members and create tasks
 * 6. Update the project status to 'archived'
 * 7. Retrieve the archived project and validate data preservation
 */
export async function test_api_project_retrieve_archived_preserves_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection);
  typia.assert(authResult);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create an employee record
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authResult.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create a project with status 'active'
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Assign project members
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
  // 6. Create tasks in the project
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        title: "Test Task",
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // 7. Update the project status to 'archived'
  const archivedProject =
    await api.functional.hrmTimeTrack.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IHrmTimeTrackProject.IUpdate,
    });
  typia.assert(archivedProject);
  // 8. Retrieve the archived project
  const retrievedProject = await api.functional.hrmTimeTrack.member.projects.at(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(retrievedProject);
  // 9. Validate data preservation
  TestValidator.equals(
    "project status is archived",
    retrievedProject.status,
    "archived",
  );
  TestValidator.equals("project ID preserved", retrievedProject.id, project.id);
  TestValidator.equals(
    "project name preserved",
    retrievedProject.name,
    project.name,
  );
  TestValidator.predicate(
    "organization field present",
    retrievedProject.organization.id !== undefined,
  );
  TestValidator.predicate(
    "project members array exists",
    Array.isArray(retrievedProject.projectMembers),
  );
  TestValidator.predicate(
    "tasks array exists",
    Array.isArray(retrievedProject.tasks),
  );
  TestValidator.predicate(
    "project members preserved",
    retrievedProject.projectMembers.length > 0,
  );
  TestValidator.predicate("tasks preserved", retrievedProject.tasks.length > 0);
  TestValidator.predicate(
    "created_at preserved",
    retrievedProject.created_at === project.created_at,
  );
  TestValidator.predicate(
    "assigned employee in project members",
    retrievedProject.projectMembers.some(
      (member) => member.employee.id === employee.id,
    ),
  );
  TestValidator.predicate(
    "created task in tasks",
    retrievedProject.tasks.some((t) => t.id === task.id),
  );
}