import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_analytics_with_assigned_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {});
  typia.assert(authorizedAdmin);
  // 2. Create a new project with valid color code
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: `#${RandomGenerator.alphabets(6)}`,
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Get project ID - assuming project has an id property
  const projectId =
    (project as any).id ?? (project as any).items?.[0]?.projectId;
  if (!projectId) {
    throw new Error("Failed to get project ID from created project");
  }
  // 3. Create employees to assign to the project
  // Create 3 employees: 2 will be members, 1 will be project lead
  const employee1 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  const employee2 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "part-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  const employee3 = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "contractor",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  // Extract employee IDs from invitations - they should have employee IDs or member IDs
  const employeeId1 =
    (employee1 as any).employee?.id ??
    (employee1 as any).member?.id ??
    typia.random<string & tags.Format<"uuid">>();
  const employeeId2 =
    (employee2 as any).employee?.id ??
    (employee2 as any).member?.id ??
    typia.random<string & tags.Format<"uuid">>();
  const employeeId3 =
    (employee3 as any).employee?.id ??
    (employee3 as any).member?.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 4. Assign employees to the project
  // Assign 2 members with 'member' role
  const member1 = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      body: {
        assignedRole: "member",
        employeeId: employeeId1,
      } satisfies IErpHrmProjectMember.ICreate,
      params: { projectId: projectId },
    },
  );
  typia.assert(member1);
  const member2 = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      body: {
        assignedRole: "member",
        employeeId: employeeId2,
      } satisfies IErpHrmProjectMember.ICreate,
      params: { projectId: projectId },
    },
  );
  typia.assert(member2);
  // Assign 1 member with 'project_lead' role
  const member3 = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      body: {
        assignedRole: "project_lead",
        employeeId: employeeId3,
      } satisfies IErpHrmProjectMember.ICreate,
      params: { projectId: projectId },
    },
  );
  typia.assert(member3);
  // 5. Retrieve project member analytics
  const analytics =
    await api.functional.erpHrm.admin.projects.analytics.members.at(
      adminConnection,
      {
        projectId: projectId,
      },
    );
  typia.assert(analytics);
  // 6. Validate analytics response structure
  // totalCount should be 3 (2 members + 1 project lead)
  TestValidator.equals("totalCount equals 3", analytics.totalCount, 3);
  // memberCount should be 2 (members with 'member' role)
  TestValidator.equals("memberCount equals 2", analytics.memberCount, 2);
  // projectLeadCount should be 1 (members with 'project_lead' role)
  TestValidator.equals(
    "projectLeadCount equals 1",
    analytics.projectLeadCount,
    1,
  );
  // members array should have 3 items
  TestValidator.equals(
    "members array length is 3",
    analytics.members.length,
    3,
  );
}