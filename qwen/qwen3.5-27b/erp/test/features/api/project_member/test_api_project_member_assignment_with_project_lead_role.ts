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
 * Test assigning an employee to a project with elevated project-lead role.
 *
 * Validates the complete project member assignment flow with role-based permissions. Ensures that the employee is correctly assigned to the project with the project-lead role, which grants elevated task management permissions.
 *
 * Special attention is given to verifying that the role is properly set to 'project-lead' and that the response contains all expected fields including employee and project references.
 *
 * 1. Authenticate as a member user with project management permissions.
 * 2. Create a project within the member's organization.
 * 3. Create an employee record in the same organization.
 * 4. Assign the employee to the project with role 'project-lead'.
 * 5. Validate that the assignment response contains correct role, employee, and project data.
 */
export async function test_api_project_member_assignment_with_project_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmTimeTrackMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create a project
  const project: IHrmTimeTrackProject =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          status: "active",
        },
      },
    );
  typia.assert(project);
  // 3. Create an employee using the authenticated member's ID
  const employee: IHrmTimeTrackEmployee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          position: RandomGenerator.paragraph({ sentences: 1 }),
          employment_type: "full-time",
          hire_date: new Date().toISOString(),
          status: "active",
          hrm_time_track_member_id: memberAuth.id,
        },
      },
    );
  typia.assert(employee);
  // 4. Assign employee to project with project-lead role
  const projectMember: IHrmTimeTrackProjectMember =
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
  // 5. Validate assignment
  TestValidator.equals(
    "role is project-lead",
    projectMember.role,
    "project-lead",
  );
  TestValidator.equals(
    "employee id matches",
    projectMember.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project id matches",
    projectMember.project.id,
    project.id,
  );
  TestValidator.predicate(
    "created_at is valid",
    projectMember.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    projectMember.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", projectMember.deleted_at, null);
}
