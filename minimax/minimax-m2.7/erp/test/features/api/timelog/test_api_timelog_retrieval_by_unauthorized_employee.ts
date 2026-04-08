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
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_retrieval_by_unauthorized_employee(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin creates organization and sets up project
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // Create project as admin
  const project = typia.assert<IErpHrmProject>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#4A90E2",
        status: "active",
      },
    }),
  );
  // Step 2: Create member A and assign to project
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {});
  // Set organization context for member A
  const orgContextA =
    await api.functional.erpHrm.member.organization_context.select(
      memberAConnection,
      {
        body: {
          organizationId: (project as any).organization.id,
        },
      },
    );
  typia.assert(orgContextA);
  // Assign member A to the project
  await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
    projectId: (project as any).id,
    body: {
      employeeId: orgContextA.employee.id,
      assignedRole: "member",
    },
  });
  // Member A creates a timelog
  const timelogA = await generate_random_erp_hrm_member_timelogs_create(
    memberAConnection,
    {
      body: {
        projectId: (project as any).id,
        date: new Date().toISOString(),
        durationMinutes: 120,
        description: "Test timelog by member A",
        billable: true,
      },
    },
  );
  typia.assert(timelogA);
  // Step 3: Authenticate member B (regular employee without time:view_all permission)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Set organization context for member B to the same organization
  await api.functional.erpHrm.member.organization_context.select(
    memberBConnection,
    {
      body: {
        organizationId: (project as any).organization.id,
      },
    },
  );
  // Step 4: Attempt to retrieve member A's timelog as member B
  // Member B should receive HTTP 404 because they don't have time:view_all permission
  // and are not the owner of this timelog
  await TestValidator.httpError(
    "unauthorized member B cannot access member A's timelog",
    404,
    async () =>
      await api.functional.erpHrm.member.timelogs.at(memberBConnection, {
        timelogId: timelogA.id,
      }),
  );
}