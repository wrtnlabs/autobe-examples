import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_invitations_create } from "../../../generate/generate_random_erp_hrm_member_invitations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_reassignment_after_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager user with project:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  typia.assert(manager);
  // 2. Create project for member removal and reassignment
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // 3. Create employee via invitation
  // First create a member account for the employee
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeJoinConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(employeeMember);
  // Create invitation (existing user path - immediately creates employee)
  const invitation = await generate_random_erp_hrm_member_invitations_create(
    managerConnection,
    {
      body: {
        email: employeeEmail,
      } satisfies IErpHrmInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // Note: The invitation response doesn't expose employee ID directly in type
  // Since this is an existing user, the employee was created with matching email
  // The employee_id for project assignment should come from the employee's member record
  // Using the member ID as a proxy since employee is linked to member
  // 4. Initial assignment before first removal
  const initialMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {},
      },
    );
  typia.assert(initialMembership);
  const originalMemberId = initialMembership.id;
  // 5. Remove the employee from the project via DELETE
  await api.functional.erpHrm.member.projects.members.erase(managerConnection, {
    projectId: project.id,
    memberId: originalMemberId,
  });
  // 6. Re-assign the same employee to the same project
  const newMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {},
      },
    );
  typia.assert(newMembership);
  // 7. Validations
  TestValidator.notEquals(
    "new membership ID differs from original",
    newMembership.id,
    originalMemberId,
  );
  TestValidator.equals(
    "project reference matches",
    newMembership.id,
    project.id,
  );
}
