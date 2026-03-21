import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_multiple_projects_different_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with project management permission
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  // 2. Create two separate projects (Project A and Project B)
  const projectA = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(projectA);
  const projectB = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(projectB);
  // 3. Create an employee record for a team member
  const employee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {},
  );
  typia.assert(employee);
  // 4. Add the employee to Project A with 'member' role
  const membershipA =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: projectA.id },
        body: {
          employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(membershipA);
  // Verify initial role in Project A
  TestValidator.equals("Initial role in Project A", membershipA.role, "member");
  // 5. Add the same employee to Project B with 'project_lead' role
  const membershipB =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: projectB.id },
        body: {
          employee_id: employee.id,
          role: "project_lead",
        },
      },
    );
  typia.assert(membershipB);
  // Verify initial role in Project B
  TestValidator.equals(
    "Initial role in Project B",
    membershipB.role,
    "project_lead",
  );
  // Verify separate membership records exist (different IDs)
  TestValidator.notEquals(
    "Membership IDs are different",
    membershipA.id,
    membershipB.id,
  );
  // Verify both memberships belong to the same employee
  TestValidator.equals(
    "Membership A employee",
    membershipA.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "Membership B employee",
    membershipB.employee.id,
    employee.id,
  );
  // Verify memberships belong to different projects
  TestValidator.equals(
    "Membership A project",
    membershipA.project.id,
    projectA.id,
  );
  TestValidator.equals(
    "Membership B project",
    membershipB.project.id,
    projectB.id,
  );
  // 6. Update role in Project A to 'project_lead'
  const updatedMembershipA =
    await api.functional.erpHrm.member.projects.members.update(
      managerConnection,
      {
        projectId: projectA.id,
        projectMemberId: membershipA.id,
        body: { role: "project_lead" } satisfies IErpHrmProjectMember.IUpdate,
      },
    );
  typia.assert(updatedMembershipA);
  // Verify role in Project A is now 'project_lead'
  TestValidator.equals(
    "Project A role after update",
    updatedMembershipA.role,
    "project_lead",
  );
  TestValidator.equals(
    "Project A membership still references same employee",
    updatedMembershipA.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "Project A membership still references same project",
    updatedMembershipA.project.id,
    projectA.id,
  );
  // 7. Update role in Project B to 'member'
  // This demonstrates that Project B's role is independent of Project A
  const updatedMembershipB =
    await api.functional.erpHrm.member.projects.members.update(
      managerConnection,
      {
        projectId: projectB.id,
        projectMemberId: membershipB.id,
        body: { role: "member" } satisfies IErpHrmProjectMember.IUpdate,
      },
    );
  typia.assert(updatedMembershipB);
  // Verify role in Project B is now 'member'
  TestValidator.equals(
    "Project B role after update",
    updatedMembershipB.role,
    "member",
  );
  TestValidator.equals(
    "Project B membership still references same employee",
    updatedMembershipB.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "Project B membership still references same project",
    updatedMembershipB.project.id,
    projectB.id,
  );
  // 8. Verify Project A role remains 'project_lead' by updating it
  // (demonstrating Project B update didn't affect Project A)
  const finalMembershipA =
    await api.functional.erpHrm.member.projects.members.update(
      managerConnection,
      {
        projectId: projectA.id,
        projectMemberId: membershipA.id,
        body: { role: "project_lead" } satisfies IErpHrmProjectMember.IUpdate,
      },
    );
  typia.assert(finalMembershipA);
  // Project A role should still be 'project_lead' (unchanged from step 6)
  TestValidator.equals(
    "Project A role unchanged after Project B update",
    finalMembershipA.role,
    "project_lead",
  );
}
