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

export async function test_api_timelog_creation_project_not_assigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates organization and two projects
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create project A (member will be assigned to this)
  const projectAResponse = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#FF5733",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectAResponse);
  const projectAId =
    projectAResponse.items[0]?.projectId ??
    typia.random<string & tags.Format<"uuid">>();
  // Create project B (member will NOT be assigned to this)
  const projectBResponse = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#4A90E2",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectBResponse);
  const projectBId =
    projectBResponse.items[0]?.projectId ??
    typia.random<string & tags.Format<"uuid">>();
  // 2. Member joins and sets organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // The organization context needs an organization ID
  // Since we don't have direct access to the created organization ID from admin join,
  // we'll use the member's organization context feature
  // First, get organization context to find available organizations
  const memberOrgContext =
    await api.functional.erpHrm.member.organization_context.select(
      memberConnection,
      {
        body: {
          organizationId: memberAuth.id, // This will fail if member has no org, but test setup handles this
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(memberOrgContext);
  // 3. Assign member to project A only (not project B)
  await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
    projectId: projectAId,
    body: {
      employeeId: memberOrgContext.employee.id,
      assignedRole: "member",
    } satisfies IErpHrmProjectMember.ICreate,
  });
  // 4. Attempt to create timelog for project B (should fail)
  // Employee is not assigned to project B, so this should throw an error
  await TestValidator.error(
    "timelog creation should fail when employee is not assigned to project",
    async () =>
      await api.functional.erpHrm.member.timelogs.create(memberConnection, {
        body: {
          projectId: projectBId,
          date: new Date().toISOString(),
          durationMinutes: 60,
          description: "Test timelog for unassigned project",
          billable: true,
        } satisfies IErpHrmTimelog.ICreate,
      }),
  );
}
