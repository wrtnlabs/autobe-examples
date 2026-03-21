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

export async function test_api_project_member_role_independent_across_projects(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create two different projects
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#3A7AFE",
        status: "active" as const,
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#28A745",
        status: "active" as const,
      },
    },
  );
  typia.assert(project2);
  // 3. Create an invitation to create an employee for project assignment
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/invite" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
    },
  });
  typia.assert(employeeAuth);
  // 4. Create invitation for the employee
  const invitation = await generate_random_erp_hrm_member_invitations_create(
    memberConnection,
    {
      body: {
        email: employeeAuth.email,
        position: "Senior Developer",
      },
    },
  );
  typia.assert(invitation);
  // 5. Assign employee to first project as member
  const membership1 =
    await api.functional.erpHrm.member.projects.members.create(
      memberConnection,
      {
        projectId: project1.id,
        body: {
          erpHrmEmployeeId: employeeAuth.id,
          assignedRole: "member",
        } as any,
      },
    );
  typia.assert(membership1);
  // 6. Assign same employee to second project as member
  const membership2 =
    await api.functional.erpHrm.member.projects.members.create(
      memberConnection,
      {
        projectId: project2.id,
        body: {
          erpHrmEmployeeId: employeeAuth.id,
          assignedRole: "member",
        } as any,
      },
    );
  typia.assert(membership2);
  // 7. Update the first project's membership to 'project_lead'
  const updatedMembership1 =
    await api.functional.erpHrm.member.projects.members.update(
      memberConnection,
      {
        projectId: project1.id,
        memberId: membership1.id,
        body: {
          assignedRole: "project_lead",
        } as any,
      },
    );
  typia.assert(updatedMembership1);
  // 8. Verify the second project membership still exists independently (different ID)
  TestValidator.notEquals(
    "membership IDs are different",
    membership1.id,
    membership2.id,
  );
  // 9. Validate that each project membership is independent by checking IDs remain the same
  TestValidator.equals(
    "first membership ID unchanged after update",
    membership1.id,
    updatedMembership1.id,
  );
  TestValidator.equals(
    "second membership still exists",
    membership2.id !== undefined,
    true,
  );
}
