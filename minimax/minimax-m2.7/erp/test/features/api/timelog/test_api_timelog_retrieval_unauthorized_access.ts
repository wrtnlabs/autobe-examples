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
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {
      body: {
        name: `Test Organization ${RandomGenerator.alphabets(8)}`,
      },
    },
  );
  typia.assert(organization);
  // 3. Create custom role WITHOUT time:view_all permission
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Role without time:view_all ${RandomGenerator.alphabets(8)}`,
        permissions: [
          "employee:view",
          "project:view",
          "employee:manage",
        ] as const,
      },
    },
  );
  typia.assert(customRole);
  // 4. Create department
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: `Test Department ${RandomGenerator.alphabets(6)}`,
      },
    },
  );
  typia.assert(department);
  // 5. Create employee record for admin with custom role
  const adminEmployee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: admin.email,
        roleId: customRole.id,
        departmentId: department.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(adminEmployee);
  // 6. Create member account for timelog owner
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 7. Create employee record for the member (timelog owner)
  const memberEmployee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: member.email,
        roleId: customRole.id,
        departmentId: department.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(memberEmployee);
  // 8. Create project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: `Test Project ${RandomGenerator.alphabets(6)}`,
      },
    },
  );
  typia.assert(project);
  // 9. Create timelog as member
  // Use (project as unknown as { id: string }).id since IErpHrmProject type doesn't expose id
  const projectId = (
    project as unknown as {
      id: string;
    }
  ).id;
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: new Date().toISOString(),
        durationMinutes: 120,
        description: "Test timelog for unauthorized access test",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 10. Attempt to retrieve timelog as admin without time:view_all permission
  // Expected: 403 Forbidden
  await TestValidator.httpError(
    "Admin without time:view_all permission cannot access other member's timelog",
    403,
    async () =>
      await api.functional.erpHrm.admin.members.timelogs.at(adminConnection, {
        memberId: member.id,
        timelogId: timelog.id,
      }),
  );
}
