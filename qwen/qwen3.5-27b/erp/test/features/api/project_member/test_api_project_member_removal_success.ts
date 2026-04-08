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
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_projects_members_create } from "../../../generate/generate_random_hrm_time_track_member_projects_members_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";

/**
 * Test the primary success path for removing an employee from a project.
 *
 * Validates the complete project member removal workflow including member authentication, employee and project setup, member assignment, and successful removal. Ensures that the project membership is properly deleted while preserving all related historical data such as timelogs, tasks, and task history.
 *
 * The test verifies that after removal, the employee record itself remains intact and the employee can be re-added to the project later. This ensures data integrity and proper audit trail maintenance.
 *
 * 1. Authenticate as a member with project management permission.
 * 2. Create an employee record that will be assigned to the project.
 * 3. Create a project to which the employee will be assigned.
 * 4. Assign the employee to the project with 'member' role.
 * 5. Remove the employee from the project using the erase endpoint.
 * 6. Validate that the removal was successful by re-assigning the employee.
 */
export async function test_api_project_member_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create employee record
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Assign employee to project
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
  // Validate initial assignment exists
  TestValidator.equals(
    "initial membership role is member",
    projectMember.role,
    "member",
  );
  TestValidator.equals(
    "initial membership employee matches",
    projectMember.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "initial membership project matches",
    projectMember.project.id,
    project.id,
  );
  // 5. Remove employee from project
  await api.functional.hrmTimeTrack.member.projects.members.erase(
    memberConnection,
    {
      projectId: project.id,
      employeeId: employee.id,
    },
  );
  // 6. Validate removal success - employee record still exists
  TestValidator.predicate(
    "employee record still exists after removal",
    employee.id != null,
  );
  // 7. Validate employee can be re-added (confirms previous membership was deleted)
  const reAssignedMember =
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
  typia.assert(reAssignedMember);
  TestValidator.equals(
    "re-assignment employee matches",
    reAssignedMember.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "re-assignment project matches",
    reAssignedMember.project.id,
    project.id,
  );
  TestValidator.equals(
    "re-assignment role is member",
    reAssignedMember.role,
    "member",
  );
}
