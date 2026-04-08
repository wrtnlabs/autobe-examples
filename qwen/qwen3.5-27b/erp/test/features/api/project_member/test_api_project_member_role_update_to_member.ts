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
 * Test updating an employee's project membership role from 'project-lead' to 'member' (role demotion).
 *
 * Validates the project member role update workflow, ensuring that an employee's role can be successfully demoted from project-lead to member. The test verifies that the role change is applied correctly and that the employee retains their project membership after the update.
 *
 * 1. Authenticate a member account for API access.
 * 2. Create a project within the organization.
 * 3. Create an employee record for the organization.
 * 4. Assign the employee to the project with 'project-lead' role.
 * 5. Verify the initial role is 'project-lead'.
 * 6. Update the project member role from 'project-lead' to 'member'.
 * 7. Validate the updated role is 'member' and membership is retained.
 */
export async function test_api_project_member_role_update_to_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create employee
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Assign employee to project with 'project-lead' role
  const initialMember =
    await generate_random_hrm_time_track_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employee.id,
          role: "project-lead",
        } satisfies IHrmTimeTrackProjectMember.ICreate,
      },
    );
  typia.assert(initialMember);
  // 5. Verify initial role is 'project-lead'
  TestValidator.equals(
    "initial role is project-lead",
    initialMember.role,
    "project-lead",
  );
  // 6. Update role from 'project-lead' to 'member'
  const updatedMember =
    await api.functional.hrmTimeTrack.member.projects.members.update(
      memberConnection,
      {
        projectId: project.id,
        employeeId: employee.id,
        body: {
          role: "member",
        } satisfies IHrmTimeTrackProjectMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // 7. Validate role update
  TestValidator.equals("role updated to member", updatedMember.role, "member");
  TestValidator.notEquals(
    "role changed from initial",
    initialMember.role,
    updatedMember.role,
  );
  TestValidator.equals(
    "employee retained in project",
    updatedMember.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project membership maintained",
    updatedMember.project.id,
    project.id,
  );
}
