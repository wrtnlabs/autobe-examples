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
 * Test successful timelog creation workflow.
 *
 * 1. Authenticate as a member to obtain JWT access token
 * 2. Create an organization to establish organizational context
 * 3. Create a role for permission management
 * 4. Create an organization member record linking the authenticated user to the organization
 * 5. Create a project for time tracking
 * 6. Assign the organization member to the project
 * 7. Create a timelog with specific start/end times
 * 8. Validate that duration is calculated correctly, project reference is populated,
 *    organization member is set from JWT context, and created_at timestamp is set.
 */
export async function test_api_timelog_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as member
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create role
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {},
  );
  // 4. Create organization member linking authenticated user to organization
  const orgMember =
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
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  // 6. Assign organization member to project
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        organizationMemberId: orgMember.id,
        role: "member",
      },
    },
  );
  // 7. Create timelog with specific timestamps to verify duration calculation
  const startTime = new Date("2026-03-16T09:00:00.000Z");
  const endTime = new Date("2026-03-16T10:30:00.000Z");
  const expectedDurationMinutes = 90; // 1 hour 30 minutes
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        billable: false,
        description: "Test work session for project",
      },
    },
  );
  // 8. Validate timelog response
  typia.assert(timelog);
  // Validate duration is calculated correctly from timestamps
  TestValidator.equals(
    "duration calculated correctly",
    timelog.durationMinutes,
    expectedDurationMinutes,
  );
  // Validate project reference is populated with IErpHrmProject.ISummary
  TestValidator.equals(
    "project reference populated",
    timelog.project.id,
    project.id,
  );
  TestValidator.predicate("project is summary type", !!timelog.project.name);
  // Validate organization member is automatically set from JWT context
  TestValidator.equals(
    "organization member set from JWT",
    timelog.organizationMember.user.id,
    authorizedMember.id,
  );
  // Validate created at timestamp is set
  TestValidator.predicate("createdAt timestamp is set", !!timelog.createdAt);
  // Validate billable defaults to false (we set it explicitly to false)
  TestValidator.equals("billable is false", timelog.billable, false);
}
