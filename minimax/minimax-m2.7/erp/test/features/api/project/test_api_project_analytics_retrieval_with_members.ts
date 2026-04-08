import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_analytics_retrieval_with_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  const memberEmail = memberAuth.email;
  // 2. Register admin account (creates organization)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Create project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  // 4. Create employee linking member to organization
  const employee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: memberEmail,
        roleId: "00000000-0000-0000-0000-000000000000",
        employmentType: "full-time",
      },
    },
  );
  // 5. Assign employee to project as member
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: { projectId: (project as any).id },
    body: {
      employeeId: employee.id,
      assignedRole: "member",
    },
  });
  // 6. Member login (use same connection after join)
  const memberLoginConnection: api.IConnection = { host: connection.host };
  memberLoginConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 7. Set organization context
  const organizationId = (employee as any).organization?.id;
  if (organizationId) {
    await generate_random_erp_hrm_member_organization_context_select(
      memberLoginConnection,
      {
        body: {
          organizationId: organizationId,
        },
      },
    );
  }
  // 8. Retrieve project member analytics
  const analytics =
    await api.functional.erpHrm.member.projects.analytics.members.at(
      memberLoginConnection,
      { projectId: (project as any).id },
    );
  // Validate response with typia.assert
  typia.assert(analytics);
  // Validate business logic
  TestValidator.predicate(
    "has at least 1 member",
    analytics.totalMemberCount >= 1,
  );
  TestValidator.predicate(
    "has role breakdown",
    analytics.roleBreakdown !== undefined,
  );
  TestValidator.predicate(
    "members array is not empty",
    analytics.members.length > 0,
  );
  // Validate first member has required properties
  const firstMember = analytics.members[0];
  TestValidator.predicate(
    "has assigned role",
    (firstMember as any).assignedRole !== undefined,
  );
  TestValidator.predicate(
    "has created at",
    (firstMember as any).createdAt !== undefined,
  );
  TestValidator.predicate(
    "has member info",
    (firstMember as any).member !== undefined,
  );
}