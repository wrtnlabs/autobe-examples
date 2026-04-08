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

export async function test_api_timelog_creation_with_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins to set up organization and project
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Member joins to create employee account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Set organization context for admin and get orgId
  const adminOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminConnection,
      {},
    );
  const orgId = adminOrgContext.organization.id;
  // 4. Set organization context for member
  await api.functional.erpHrm.member.organization_context.select(
    memberConnection,
    {
      body: {
        organizationId: orgId,
      } satisfies IErpHrmOrganizationContext.ICreate,
    },
  );
  // 5. Admin creates an active project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#4A90E2",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 6. Get member's employee ID from organization context
  const memberOrgContext =
    await api.functional.erpHrm.member.organization_context.select(
      memberConnection,
      {
        body: {
          organizationId: orgId,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  const employeeId = memberOrgContext.employee.id;
  // 7. Admin assigns member to the project
  // Extract projectId from budget report items array
  const projectId =
    project.items[0]?.projectId ?? typia.random<string & tags.Format<"uuid">>();
  await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
    projectId: projectId,
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    } satisfies IErpHrmProjectMember.ICreate,
  });
  // 8. Member creates timelog with required fields only
  const today = new Date().toISOString();
  const timelog = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: today,
        durationMinutes: 60,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 9. Validate response
  TestValidator.predicate(
    "timelog has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      timelog.id,
    ),
  );
  TestValidator.equals("billable defaults to true", timelog.billable, true);
  TestValidator.predicate(
    "createdAt is set",
    timelog.createdAt !== null && timelog.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is set",
    timelog.updatedAt !== null && timelog.updatedAt !== undefined,
  );
}
