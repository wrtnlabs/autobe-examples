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

type IErpHrmProjectWithId = IErpHrmProject & { id: string };

export async function test_api_timer_start_blocked_with_existing_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create an organization (admin creates it, admin becomes the owner/employee)
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  // 3. Create first project
  const project1 = typia.assert<IErpHrmProjectWithId>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#4A90E2",
        status: "active",
      },
    }),
  );
  // 4. Create second project
  const project2 = typia.assert<IErpHrmProjectWithId>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      },
    }),
  );
  // 5. Get employee ID from organization context (admin is the owner)
  const orgContext =
    await api.functional.erpHrm.member.organization_context.select(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
        },
      },
    );
  const employeeId = orgContext.employee.id;
  // 6. Assign employee to both projects
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: {
      projectId: project1.id,
    },
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    },
  });
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: {
      projectId: project2.id,
    },
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    },
  });
  // 7. Start first timer (should succeed with 201)
  const firstTimer = await api.functional.erpHrm.member.timers.create(
    adminConnection,
    {
      body: {
        erpHrmProjectId: project1.id,
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(firstTimer);
  // 8. Attempt to start second timer (should fail with 409)
  await TestValidator.error(
    "second timer blocked when first exists",
    async () => {
      await api.functional.erpHrm.member.timers.create(adminConnection, {
        body: {
          erpHrmProjectId: project2.id,
        } satisfies IErpHrmTimer.ICreate,
      });
    },
  );
}