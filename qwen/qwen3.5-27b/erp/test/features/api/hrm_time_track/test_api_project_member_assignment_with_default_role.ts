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
 * Test project member assignment with default role when role is not specified.
 *
 * Validates the complete project member assignment workflow where an employee is assigned to a project without explicitly specifying a role, ensuring the system correctly defaults to the 'member' role. Tests that the assignment creates proper references to both employee and project, and that all required fields are populated correctly.
 *
 * Special attention is given to verifying the default role behavior and ensuring that the employee and project belong to the same organization through shared authentication context.
 *
 * 1. Authenticate as a member user with project management permissions.
 * 2. Create a project within the authenticated member's organization.
 * 3. Create an employee record in the same organization.
 * 4. Assign the employee to the project without specifying a role.
 * 5. Validate that the role defaults to 'member' and all references are correct.
 */
export async function test_api_project_member_assignment_with_default_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create an employee in the same organization
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Assign employee to project without specifying role (should default to 'member')
  const projectMember =
    await generate_random_hrm_time_track_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employee.id,
        },
      },
    );
  typia.assert(projectMember);
  // 5. Validate default role is 'member'
  TestValidator.equals(
    "default role should be member",
    projectMember.role,
    "member",
  );
  // 6. Validate employee reference matches
  TestValidator.equals(
    "employee_id matches assigned employee",
    projectMember.employee.id,
    employee.id,
  );
  // 7. Validate project reference matches
  TestValidator.equals(
    "project_id matches assigned project",
    projectMember.project.id,
    project.id,
  );
  // 8. Validate timestamps are set
  TestValidator.predicate(
    "created_at is a valid date-time",
    () => !isNaN(Date.parse(projectMember.created_at)),
  );
  TestValidator.predicate(
    "updated_at is a valid date-time",
    () => !isNaN(Date.parse(projectMember.updated_at)),
  );
  // 9. Validate employee and project summaries are present
  TestValidator.predicate(
    "employee summary has required fields",
    () =>
      projectMember.employee.member.email !== undefined &&
      projectMember.employee.position !== undefined,
  );
  TestValidator.predicate(
    "project summary has required fields",
    () =>
      projectMember.project.name !== undefined &&
      projectMember.project.organization.name !== undefined,
  );
}
