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
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_project_member_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create role for employee
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["project:view", "project:manage"] as const,
      },
    },
  );
  typia.assert(role);
  // 3. Create employee
  const employee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: role.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Create project member
  const projectMember =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        body: {
          employeeId: (employee as any).member.id as string & tags.Format<"uuid">,
          assignedRole: "member",
        },
        params: {
          projectId: (project as any).id as string & tags.Format<"uuid">,
        },
      },
    );
  typia.assert(projectMember);
  // 6. Generate non-existent projectMemberId
  const nonExistentProjectMemberId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 7. Call GET with valid projectId but non-existent projectMemberId
  await TestValidator.httpError(
    "non-existent project member returns 404",
    404,
    async () =>
      await api.functional.erpHrm.admin.projects.members.at(adminConnection, {
        projectId: (project as any).id as string & tags.Format<"uuid">,
        projectMemberId: nonExistentProjectMemberId,
      }),
  );
}
