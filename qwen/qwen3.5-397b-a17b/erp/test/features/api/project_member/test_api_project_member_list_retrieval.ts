import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

/**
 * Test project member list retrieval with role-based access validation.
 *
 * Validates the complete project member retrieval workflow including member authentication, organization creation, employee invitation and acceptance, project creation, and member assignment. Ensures that project members can successfully retrieve the list of all members assigned to their project with complete employee information.
 *
 * Special attention is given to verifying that all assigned members are returned with correct role assignments (member vs project-lead), employee details including nested member and role information, and that the response structure matches the expected IHrmPlatformProjectMember.ISummary type.
 *
 * 1. Two members register and authenticate using authorize_member_join utility.
 * 2. First member creates organization for the project and employees.
 * 3. Employee invitations are created for both members (auto-accepted since members exist).
 * 4. Project is created within the organization by first member.
 * 5. Both employees are assigned to the project with different roles (member and project-lead).
 * 6. Project member list is retrieved and validated.
 * 7. Validates response contains all members with correct structure and role differentiation.
 */
export async function test_api_project_member_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member registration and authentication (organization owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Second member registration (will be invited as employee)
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMemberAuth = await authorize_member_join(
    employeeMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(employeeMemberAuth);
  // 3. Create organization (owner becomes organization owner automatically)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 4. Create employee invitation for owner (auto-accepted since member exists)
  const ownerEmployeeInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      ownerConnection,
      {
        body: {
          email: ownerAuth.email,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(ownerEmployeeInvitation);
  // 5. Create employee invitation for second member (auto-accepted since member exists)
  const secondEmployeeInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      ownerConnection,
      {
        body: {
          email: employeeMemberAuth.email,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "part-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(secondEmployeeInvitation);
  // 6. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 7. Assign owner employee to project as member
  // Note: When invitation is auto-accepted, the response contains employee info
  // We need to extract the employee ID from the invitation response
  const firstProjectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: ownerEmployeeInvitation.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(firstProjectMember);
  // 8. Assign second employee to project as project-lead
  const secondProjectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: secondEmployeeInvitation.id,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(secondProjectMember);
  // 9. Retrieve project member list
  const members =
    await api.functional.hrmPlatform.member.projects.members.iterate(
      ownerConnection,
      {
        projectId: project.id,
      },
    );
  // Assert as array type
  const membersArray =
    typia.assert<IHrmPlatformProjectMember.ISummary[]>(members);
  // 10. Validate response structure
  TestValidator.predicate(
    "returns array of members",
    Array.isArray(membersArray),
  );
  TestValidator.predicate(
    "contains at least 2 members",
    membersArray.length >= 2,
  );
  // 11. Validate each member has required structure
  for (const member of membersArray) {
    typia.assert(member);
    // Validate role is either member or project-lead
    TestValidator.predicate(
      "role is valid",
      member.role === "member" || member.role === "project-lead",
    );
    // Validate employee details exist
    TestValidator.predicate(
      "employee has id",
      member.employee.id !== undefined,
    );
    TestValidator.predicate(
      "employee has member info",
      member.employee.member !== undefined,
    );
    TestValidator.predicate(
      "employee has member email",
      member.employee.member.email !== undefined,
    );
    TestValidator.predicate(
      "employee has role info",
      member.employee.role !== undefined,
    );
    TestValidator.predicate(
      "employee has status",
      member.employee.status !== undefined,
    );
    TestValidator.predicate(
      "employee has employment_type",
      member.employee.employment_type !== undefined,
    );
  }
  // 12. Validate role differentiation exists in the team
  const roles = membersArray.map(
    (m: IHrmPlatformProjectMember.ISummary) => m.role,
  );
  TestValidator.predicate("has member role", roles.includes("member"));
  TestValidator.predicate(
    "has project-lead role",
    roles.includes("project-lead"),
  );
  // 13. Validate both assigned employees are present
  const employeeIds = membersArray.map(
    (m: IHrmPlatformProjectMember.ISummary) => m.employee.id,
  );
  TestValidator.predicate(
    "contains first employee",
    employeeIds.includes(firstProjectMember.employee.id),
  );
  TestValidator.predicate(
    "contains second employee",
    employeeIds.includes(secondProjectMember.employee.id),
  );
}
