import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Billable timelog creation for client-chargeable work. An authenticated employee creates a timelog marked as billable=true for work that should be charged to clients. Tests billable status handling and distinguishable work classification.
 */
export async function test_api_timelog_create_billable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create role for organization member
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        permissions: [
          { permission: "project.view" },
          { permission: "timelog.manage" },
        ],
      },
    },
  );
  // 4. Create organization member linking the authenticated user
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: authorizedMember.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  // 5. Create project for client-chargeable work
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        budgetHours: 100,
        status: "active",
      },
    },
  );
  // 6. Assign member to project
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: organizationMember.id,
        role: "member",
      },
    },
  );
  // 7. Create billable timelog with 90 minutes duration
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 90 * 60 * 1000); // 90 minutes later
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        billable: true,
        description: "Client billable work session",
      },
    },
  );
  // 8. Validate response
  typia.assert(timelog);
  TestValidator.equals("billable status is true", timelog.billable, true);
  TestValidator.equals("duration is 90 minutes", timelog.durationMinutes, 90);
  TestValidator.equals(
    "project reference matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "organization member reference matches",
    timelog.organizationMember.id,
    organizationMember.id,
  );
}
