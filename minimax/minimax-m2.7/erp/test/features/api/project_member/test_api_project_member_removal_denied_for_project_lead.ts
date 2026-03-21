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

export async function test_api_project_member_removal_denied_for_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create manager user with project:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {});
  typia.assert(managerAuth);
  // Setup: Create project lead user
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadAuth = await authorize_member_join(
    projectLeadConnection,
    {},
  );
  typia.assert(projectLeadAuth);
  // Setup: Create employee to be removed
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // Create project owned by manager
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Create invitation for project lead (creates employee record)
  await generate_random_erp_hrm_member_invitations_create(managerConnection, {
    body: {
      email: projectLeadAuth.email,
    },
  });
  // Assign project lead to the project
  const projectLeadAssignment =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color: "#1E90FF" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
          status: "active",
        },
      },
    );
  typia.assert(projectLeadAssignment);
  // Create invitation for employee (creates employee record)
  await generate_random_erp_hrm_member_invitations_create(managerConnection, {
    body: {
      email: employeeAuth.email,
    },
  });
  // Assign employee to project
  const employeeAssignment =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color: "#32CD32" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
          status: "active",
        },
      },
    );
  typia.assert(employeeAssignment);
  // Test: Authenticate as project lead and attempt to remove employee
  // Expect: HTTP 403 Forbidden (project lead cannot remove members, only org-level project:manage can)
  await TestValidator.httpError(
    "project lead cannot remove members from project",
    403,
    async () =>
      await api.functional.erpHrm.member.projects.members.erase(
        projectLeadConnection,
        {
          projectId: project.id,
          memberId: employeeAssignment.id,
        },
      ),
  );
}
