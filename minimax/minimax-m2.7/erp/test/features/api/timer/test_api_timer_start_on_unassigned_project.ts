import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_start_on_unassigned_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminJoinConn: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConn, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Create admin connection with token for organization setup
  const adminTokenConn: api.IConnection = { host: connection.host };
  adminTokenConn.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 3. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminTokenConn,
    {},
  );
  // 4. Create project A (will be assigned to employee)
  const projectA = await generate_random_erp_hrm_admin_projects_create(
    adminTokenConn,
    {
      body: {
        name: `${RandomGenerator.name()} Assigned`,
        color: "#FF5733",
        status: "active",
      },
    },
  ) as IErpHrmProject & { id: string };
  // 5. Create project B (employee will NOT be assigned to this project)
  const projectB = await generate_random_erp_hrm_admin_projects_create(
    adminTokenConn,
    {
      body: {
        name: `${RandomGenerator.name()} Unassigned`,
        color: "#4A90E2",
        status: "active",
      },
    },
  ) as IErpHrmProject & { id: string };
  // 6. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";
  const memberJoinConn: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConn, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    },
  });
  // 7. Set organization context for member
  // Note: This assumes member has been added to org as employee.
  // If not, this may fail and need additional setup.
  const memberOrgConn: api.IConnection = { host: connection.host };
  memberOrgConn.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  const orgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      memberOrgConn,
      {
        body: {
          organizationId: organization.id,
        },
      },
    );
  const employeeId = orgContext.employee.id;
  // 8. Assign employee ONLY to project A (not project B)
  await generate_random_erp_hrm_admin_projects_members_create(adminTokenConn, {
    params: { projectId: projectA.id },
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    },
  });
  // 9. TEST: Try to start timer on project B (unassigned) - should fail
  await TestValidator.error(
    "starting timer on unassigned project should fail with error",
    async () => {
      await api.functional.erpHrm.member.timers.create(memberOrgConn, {
        body: {
          erpHrmProjectId: projectB.id,
          description: "This should fail - not assigned to project",
        } satisfies IErpHrmTimer.ICreate,
      });
    },
  );
  // 10. POSITIVE CONTROL: Start timer on project A (assigned) - should succeed
  const timer = await api.functional.erpHrm.member.timers.create(
    memberOrgConn,
    {
      body: {
        erpHrmProjectId: projectA.id,
        description: "Working on assigned project",
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Validate timer was created for the correct project
  TestValidator.equals(
    "timer created for assigned project A",
    timer.project.id,
    projectA.id,
  );
}