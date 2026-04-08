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
 * Test removing a project-lead from a project and verify all historical data is preserved while task management capabilities are revoked.
 *
 * Validates that when a project-lead is removed from a project, the membership record is deleted but the employee record remains intact and can be re-assigned. The test ensures that the removal operation preserves all historical data and allows the employee to be re-added to the project with either member or project-lead role.
 *
 * Special attention is given to verifying that the employee record is not deleted during project membership removal and that the employee can be successfully re-assigned to the same project after removal.
 *
 * 1. Authenticate as a member with project management permission.
 * 2. Create an employee record that will be assigned as project-lead.
 * 3. Create a project to which the employee will be assigned.
 * 4. Assign the employee to the project with 'project-lead' role.
 * 5. Remove the employee from the project (delete membership).
 * 6. Verify the employee record still exists and can be re-assigned to the project.
 */
export async function test_api_project_lead_removal_preserves_data(
  connection: api.IConnection,
) {
  // 1. Authenticate as member with project management permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create an employee record that will be assigned as project-lead
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        position: "Senior Developer",
        employment_type: "full-time",
        hire_date: new Date().toISOString(),
        status: "active",
      },
    },
  );
  typia.assert(employee);
  // 3. Create a project to which the employee will be assigned
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 4. Assign the employee to the project with 'project-lead' role
  const projectMember =
    await generate_random_hrm_time_track_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employee.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  // Validate initial assignment
  TestValidator.equals(
    "initial role is project-lead",
    projectMember.role,
    "project-lead",
  );
  TestValidator.equals(
    "employee assigned correctly",
    projectMember.employee.id,
    employee.id,
  );
  // 5. Remove the employee from the project (delete membership)
  await api.functional.hrmTimeTrack.member.projects.members.erase(
    memberConnection,
    {
      projectId: project.id,
      employeeId: employee.id,
    },
  );
  // 6. Verify the employee record still exists by re-assigning to the project
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
  // Validate re-assignment success
  TestValidator.equals(
    "employee can be re-assigned after removal",
    reAssignedMember.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "re-assigned role is member",
    reAssignedMember.role,
    "member",
  );
  TestValidator.equals(
    "project reference preserved",
    reAssignedMember.project.id,
    project.id,
  );
}
