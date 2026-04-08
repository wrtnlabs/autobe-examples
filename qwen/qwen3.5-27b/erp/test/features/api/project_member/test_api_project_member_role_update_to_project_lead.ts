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
 * Test updating an employee's project membership role from 'member' to 'project-lead'.
 *
 * Validates the complete project member role update workflow including member authentication, project creation, employee creation, initial project membership assignment, and role elevation. Ensures that the role update correctly changes the employee's authority level within the project context.
 *
 * Special attention is given to verifying that the role change takes effect immediately and that the updated project member record reflects the new 'project-lead' role with appropriate timestamps.
 *
 * 1. Authenticate as a member using authorize_member_join.
 * 2. Create a project using generate_random_hrm_time_track_member_projects_create.
 * 3. Create an employee using generate_random_hrm_time_track_member_employees_create.
 * 4. Assign the employee to the project with 'member' role using generate_random_hrm_time_track_member_projects_members_create.
 * 5. Update the project member role to 'project-lead' using api.functional.hrmTimeTrack.member.projects.members.update.
 * 6. Verify the response returns the updated project member record with role='project-lead'.
 * 7. Verify the employee_id and project_id in the response match the original assignment.
 * 8. Verify the updated_at timestamp is different from created_at.
 */
export async function test_api_project_member_role_update_to_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as a member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create a project
  const project: IHrmTimeTrackProject =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        },
      },
    );
  typia.assert(project);
  // 3. Create an employee
  const employee: IHrmTimeTrackEmployee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(employee);
  // 4. Assign the employee to the project with 'member' role
  const initialMembership: IHrmTimeTrackProjectMember =
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
  typia.assert(initialMembership);
  // 5. Update the project member role to 'project-lead'
  const updatedMembership: IHrmTimeTrackProjectMember =
    await api.functional.hrmTimeTrack.member.projects.members.update(
      memberConnection,
      {
        projectId: project.id,
        employeeId: employee.id,
        body: {
          role: "project-lead",
        },
      },
    );
  typia.assert(updatedMembership);
  // 6. Verify the response returns the updated project member record with role='project-lead'
  TestValidator.equals(
    "role updated to project-lead",
    updatedMembership.role,
    "project-lead",
  );
  // 7. Verify the employee_id and project_id in the response match the original assignment
  TestValidator.equals(
    "employee matches",
    updatedMembership.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project matches",
    updatedMembership.project.id,
    project.id,
  );
  // 8. Verify the updated_at timestamp is different from created_at
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedMembership.updated_at,
    updatedMembership.created_at,
  );
}
